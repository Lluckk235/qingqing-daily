#!/usr/bin/env python3
"""每日 AI 热点新闻抓取脚本

从免费 RSS 源抓取候选新闻 → 规则分类 → 去重评分 → 生成 data/daily-news.json
可选：同步到 Supabase 实现跨设备数据一致
"""

import json
import hashlib
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

import feedparser
from deep_translator import GoogleTranslator

import requests

# ============================================================
# 配置
# ============================================================

SUPABASE_URL = "https://prpyjwxrovckkpzwytgw.supabase.co"
SUPABASE_TABLE = "daily_news"
# service_role key —— 从环境变量读取（不要硬编码！）
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
# 设为 False 则跳过 Supabase 上传
SYNC_TO_SUPABASE = bool(SUPABASE_SERVICE_KEY)

RSS_SOURCES = [
    # 英文源
    {"url": "https://www.technologyreview.com/feed/", "name": "MIT Tech Review", "weight": 2, "lang": "en"},
    {"url": "https://techcrunch.com/feed/", "name": "TechCrunch", "weight": 2, "lang": "en"},
    {"url": "https://news.ycombinator.com/rss", "name": "Hacker News", "weight": 1, "lang": "en"},
    {"url": "https://www.theverge.com/rss/index.xml", "name": "The Verge", "weight": 2, "lang": "en"},
    # 中文源
    {"url": "https://36kr.com/feed", "name": "36氪", "weight": 2, "lang": "zh"},
    {"url": "https://www.geekpark.net/rss", "name": "极客公园", "weight": 2, "lang": "zh"},
    {"url": "https://sspai.com/feed", "name": "少数派", "weight": 2, "lang": "zh"},
    {"url": "https://www.qbitai.com/feed", "name": "量子位", "weight": 2, "lang": "zh"},
    {"url": "https://www.ithome.com/rss/", "name": "IT之家", "weight": 2, "lang": "zh"},
]

CATEGORY_RULES = {
    "ai-tech": {
        "label": "AI 技术",
        "badgePool": ["AI NEWS", "RESEARCH"],
        "keywords": re.compile(
            r"ai\b|大模型|llm|gpt|claude|gemini|deepseek|芯片|算力|"
            r"训练|推理|开源模型|copilot|agent|智能体|机器人|自动驾驶|"
            r"neural|transformer|fine.?tun|pretrain|embedding|"
            r"diffusion|generative|multimodal|benchmark|sota",
            re.IGNORECASE,
        ),
    },
    "business": {
        "label": "商业",
        "badgePool": ["INSIGHT", "ANALYSIS"],
        "keywords": re.compile(
            r"财报|营收|融资|ipo|收购|裁员|股价|市值|监管|反垄断|合规|上市|"
            r"revenue|funding|acquisition|layoff|valuation|regulat|"
            r"antitrust|merger|ipo|startup.*fund|series\s+[a-d]",
            re.IGNORECASE,
        ),
    },
    "product": {
        "label": "产品",
        "badgePool": ["PRODUCT", "INSIGHT"],
        "keywords": re.compile(
            r"发布|上线|更新|新功能|用户体验|公测|内测|版本|app|浏览器|"
            r"launch|release|update|feature|beta|rollout|redesign|"
            r"new\s+(version|feature|product)",
            re.IGNORECASE,
        ),
    },
    "finance": {
        "label": "金融/市场",
        "badgePool": ["ANALYSIS", "INSIGHT"],
        "keywords": re.compile(
            r"利率|加息|降息|通胀|cpi|ppi|gdp|央行|美联储|汇率|债券|期货|"
            r"fed\b|interest\s+rate|inflation|nasdaq|s&p\s*500|dow|"
            r"stock\s+market|bond|treasury|cryptocurren|bitcoin",
            re.IGNORECASE,
        ),
    },
}

EXCLUDE_KEYWORDS = re.compile(
    r"娱乐|八卦|明星|出轨|绯闻|标题党|震惊|不看后悔|速删|"
    r"best\s+deals?|coupon|discount|sale\b|sponsored|"
    r"广告|软文|推广|promoted",
    re.IGNORECASE,
)

WHY_TEMPLATES = {
    "ai-tech": "影响 AI 应用、基础设施或行业竞争格局",
    "business": "影响公司经营、市场预期或商业模式",
    "product": "反映用户需求、产品趋势或增长方向",
    "finance": "影响风险偏好、资产定价或投资情绪",
}

TZ_SHANGHAI = timezone(timedelta(hours=8))
REQUEST_TIMEOUT = 20
TITLE_SIMILARITY_THRESHOLD = 0.7
MAX_CANDIDATES = 80
MAX_PER_CATEGORY = 3
TARGET_TOTAL = 12
EN_TARGET_RATIO = 0.55  # 目标英文 50%-60%，中文化展示
DEFAULT_DISPLAY = 6
MAX_ARTICLE_AGE_HOURS = 36

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "daily-news.json")

# ============================================================
# 工具函数
# ============================================================


def title_similarity(a: str, b: str) -> float:
    """计算两个标题的相似度"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def extract_domain(url: str) -> str:
    """从 URL 提取域名"""
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


def parse_published_at(published_str: str) -> datetime | None:
    """解析 RSS 常见发布时间，统一为 UTC。"""
    try:
        for fmt in [
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
        ]:
            try:
                dt = datetime.strptime(published_str, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except ValueError:
                continue
        dt = parsedate_to_datetime(published_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def relative_time(published_str: str) -> str:
    """将发布时间转为相对时间描述"""
    try:
        dt = parse_published_at(published_str)
        if not dt:
            return ""

        now = datetime.now(timezone.utc)
        delta = now - dt
        hours = delta.total_seconds() / 3600

        if hours < 1:
            return f"{int(delta.total_seconds() / 60)} 分钟前"
        elif hours < 24:
            return f"{int(hours)} 小时前"
        elif hours < 48:
            return "昨天"
        else:
            return f"{int(hours / 24)} 天前"
    except Exception:
        return ""


def classify_article(title: str, summary: str) -> tuple[str, str, str]:
    """基于标题+摘要规则分类，返回 (category_key, category_label, badge)"""
    text = f"{title} {summary}"
    scores = {}
    for cat_key, rules in CATEGORY_RULES.items():
        matches = rules["keywords"].findall(text)
        scores[cat_key] = len(matches)

    if not scores or max(scores.values()) == 0:
        # 默认归为 AI 技术
        rules = CATEGORY_RULES["ai-tech"]
        return ("ai-tech", rules["label"], rules["badgePool"][0])

    best = max(scores, key=scores.get)
    rules = CATEGORY_RULES[best]
    return (best, rules["label"], rules["badgePool"][0])


def score_article(source_weight: int, title: str, summary: str, cat_key: str, hours_ago: float) -> float:
    """综合评分"""
    keyword_score = 0
    text = f"{title} {summary}"
    rules = CATEGORY_RULES[cat_key]
    matches = rules["keywords"].findall(text)
    keyword_score = min(len(matches), 3)  # 最多3分

    # 时间新鲜度
    if hours_ago < 6:
        freshness = 2
    elif hours_ago < 12:
        freshness = 1.5
    elif hours_ago < 24:
        freshness = 1
    elif hours_ago < 48:
        freshness = 0.5
    else:
        freshness = 0

    return source_weight + keyword_score + freshness


def extract_summary_points(entry) -> list[str]:
    """从 RSS 条目提取 2-3 条要点"""
    description = ""
    if hasattr(entry, "summary"):
        description = entry.summary
    elif hasattr(entry, "description"):
        description = entry.description
    elif hasattr(entry, "content"):
        for c in entry.content:
            if hasattr(c, "value"):
                description += c.value

    # 去除 HTML 标签
    clean = re.sub(r"<[^>]+>", "", description)
    clean = re.sub(r"\s+", " ", clean).strip()

    if not clean:
        return [entry.title[:120]]

    # 按句号/换行分割
    sentences = re.split(r"[。！？\n]", clean)
    points = [s.strip() for s in sentences if len(s.strip()) > 10]
    return points[:3] if points else [clean[:120]]


def should_exclude(title: str, summary: str) -> bool:
    """检查是否应排除"""
    text = f"{title} {summary}"
    return bool(EXCLUDE_KEYWORDS.search(text))


def is_chinese(text: str) -> bool:
    """判断文本是否包含中文"""
    return bool(re.search(r'[\u4e00-\u9fff]', text))


def translate_text(text: str, max_len: int = 200) -> str:
    """将英文翻译为中文（使用 Google 翻译免费接口）"""
    if not text or is_chinese(text):
        return text
    try:
        truncated = text[:max_len]
        result = GoogleTranslator(source='en', target='zh-CN').translate(truncated)
        return result if result else text
    except Exception as e:
        print(f"  ⚠ 翻译失败: {str(e)[:60]}")
        return text


def translate_articles(articles: list[dict]) -> list[dict]:
    """翻译英文文章的标题和摘要"""
    zh_count = sum(1 for a in articles if a.get('isNativeCN'))
    en_count = len(articles) - zh_count
    print(f"\n🌐 中/英文分布: {zh_count}/{en_count}")

    translated = 0
    for article in articles:
        if article.get('isNativeCN'):
            continue
        old_title = article['title']
        article['title'] = translate_text(old_title)
        if article['title'] != old_title:
            translated += 1

        # 翻译摘要
        new_summary = []
        for point in article.get('summary', []):
            new_summary.append(translate_text(point, max_len=150))
        article['summary'] = new_summary

        # 翻译 why_important
        article['whyImportant'] = translate_text(article.get('whyImportant', ''), max_len=100)

    print(f"  ✓ 翻译了 {translated} 篇文章")
    return articles


# ============================================================
# Supabase 同步
# ============================================================


def sync_to_supabase(articles: list[dict], today_str: str):
    """将新闻数据写入 Supabase，并清理过期记录。"""
    if not SYNC_TO_SUPABASE:
        print("⏭ 跳过 Supabase 同步（未设置 SUPABASE_SERVICE_ROLE_KEY）")
        return

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    # 1. 清理超过时效的新闻；发布时间缺失的旧记录按写入时间清理。
    cutoff_iso = (datetime.now(timezone.utc) - timedelta(hours=MAX_ARTICLE_AGE_HOURS)).isoformat()
    try:
        del_url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
        resp = requests.delete(del_url, headers=headers, params={"published_at": f"lt.{cutoff_iso}"}, timeout=15)
        print(f"  🗑 清除超过 {MAX_ARTICLE_AGE_HOURS} 小时的新闻: {resp.status_code}")
        resp = requests.delete(
            del_url,
            headers=headers,
            params={"published_at": "is.null", "created_at": f"lt.{cutoff_iso}"},
            timeout=15,
        )
        print(f"  🗑 清除无发布时间的过期新闻: {resp.status_code}")
    except requests.RequestException as e:
        print(f"  ⚠ 清除过期新闻失败: {e}")

    # 2. 删除本轮要重建的当天数据。
    try:
        resp = requests.delete(
            f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}",
            headers=headers,
            params={"news_date": f"eq.{today_str}"},
            timeout=15,
        )
        print(f"  🗑 清除当天旧数据: {resp.status_code}")
    except requests.RequestException as e:
        print(f"  ⚠ 清除旧数据失败: {e}")

    # 2. 批量插入新数据
    success = 0
    fail = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for article in articles:
        payload = {
            "id": article["id"],
            "news_date": today_str,
            "category": article["category"],
            "title": article["title"],
            "source": article["source"],
            "published_at": article.get("published", now_iso),
            "summary": article.get("summary", []),
            "why_important": article.get("whyImportant", ""),
            "url": article["sourceUrl"],
            "rank": article.get("rank", 0),
            "created_at": now_iso,
        }

        try:
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}",
                headers=headers,
                json=payload,
                timeout=15,
            )
            if resp.status_code in (200, 201):
                success += 1
            else:
                print(f"  ✗ 写入失败 [{article['id'][:8]}]: {resp.status_code} {resp.text[:80]}")
                fail += 1
        except requests.RequestException as e:
            print(f"  ✗ 网络错误 [{article['id'][:8]}]: {e}")
            fail += 1

    print(f"\n☁ Supabase 同步: {success} 条成功, {fail} 条失败")


# ============================================================
# 主流程
# ============================================================


def fetch_all_sources() -> list[dict]:
    """并发抓取所有 RSS 源"""
    candidates = []
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        }
    )

    for src in RSS_SOURCES:
        try:
            resp = session.get(src["url"], timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            feed = feedparser.parse(resp.content)

            if feed.bozo and not feed.entries:
                print(f"  ⚠ {src['name']}: 解析失败 (bozo)")
                continue

            count = 0
            for entry in feed.entries:
                title = getattr(entry, "title", "").strip()
                summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
                link = getattr(entry, "link", "")

                if not title or not link:
                    continue
                if should_exclude(title, summary):
                    continue

                published_str = getattr(entry, "published", "") or getattr(entry, "updated", "")
                candidates.append(
                    {
                        "title": title,
                        "summary_raw": summary,
                        "url": link,
                        "source_name": src["name"],
                        "source_weight": src["weight"],
                        "domain": extract_domain(link),
                        "published_raw": published_str,
                        "lang": src["lang"],
                    }
                )
                count += 1
                if len(candidates) >= MAX_CANDIDATES:
                    break

            print(f"  ✓ {src['name']}: {count} 条")
        except requests.RequestException as e:
            print(f"  ✗ {src['name']}: {e}")
        except Exception as e:
            print(f"  ✗ {src['name']}: {e}")

    return candidates


def deduplicate(articles: list[dict]) -> list[dict]:
    """URL 去重 + 标题相似度去重"""
    seen_urls = set()
    result = []

    for article in articles:
        url = article["url"].rstrip("/")
        if url in seen_urls:
            continue
        seen_urls.add(url)

        # 标题相似度去重
        is_dup = False
        for existing in result:
            if title_similarity(article["title"], existing["title"]) > TITLE_SIMILARITY_THRESHOLD:
                is_dup = True
                break

        if not is_dup:
            result.append(article)

    return result


def process_articles(candidates: list[dict]) -> list[dict]:
    """分类、评分、排序、截断（优先中文 + 英文翻译）"""
    now = datetime.now(timezone.utc)
    processed = []

    for article in candidates:
        rel_time = relative_time(article["published_raw"])

        pub_dt = parse_published_at(article["published_raw"])
        if not pub_dt:
            continue

        hours_ago = (now - pub_dt).total_seconds() / 3600
        if hours_ago > MAX_ARTICLE_AGE_HOURS:
            continue
        cat_key, cat_label, badge = classify_article(article["title"], article["summary_raw"])
        score = score_article(
            article["source_weight"], article["title"], article["summary_raw"], cat_key, hours_ago
        )
        summary_points = extract_summary_points(
            type("Entry", (), {"summary": article["summary_raw"], "title": article["title"]})()
        )
        uid = hashlib.md5(article["url"].encode()).hexdigest()[:12]
        is_cn = article["lang"] == "zh" or is_chinese(article["title"])

        processed.append(
            {
                "id": uid,
                "title": article["title"],
                "category": cat_key,
                "categoryLabel": cat_label,
                "badge": badge,
                "source": article["source_name"],
                "sourceDomain": article["domain"],
                "sourceUrl": article["url"],
                "published": pub_dt.isoformat(),
                # 注意：relativeTime 不再写死进 JSON —— 前端统一用 published 实时计算，
                # 避免旧批次的预存值（如“3 分钟前”）在降级展示时误导用户。
                "summary": summary_points,
                "whyImportant": WHY_TEMPLATES.get(cat_key, "值得关注"),
                "tags": [],
                "score": score,
                "isNativeCN": is_cn,
            }
        )

    # 按评分排序后，分中英文两路
    processed.sort(key=lambda x: x["score"], reverse=True)

    cn_articles = [a for a in processed if a["isNativeCN"]]
    en_articles = [a for a in processed if not a["isNativeCN"]]

    print(f"\n📊 候选: 中文 {len(cn_articles)} 条, 英文 {len(en_articles)} 条")

    # 策略：ai-tech / finance 优先英文源，business / product 中文优先
    # 目标：英文 50%-60%，展示语言全中文
    EN_PRIORITY_CATS = {"ai-tech", "finance"}

    category_counts = {k: 0 for k in CATEGORY_RULES}
    final = []

    def fill_category_from(pool, cat_key, max_slots):
        """从池中选指定分类的文章"""
        filled = []
        for article in pool:
            if len(filled) >= max_slots:
                break
            if article["category"] == cat_key and category_counts[cat_key] < MAX_PER_CATEGORY:
                category_counts[cat_key] += 1
                filled.append(article)
        return filled

    # Step 1: ai-tech 和 finance 优先从英文池选
    for cat in EN_PRIORITY_CATS:
        final += fill_category_from(en_articles, cat, 2)

    # Step 2: 中文池补 ai-tech / finance 不足的槽位
    for cat in EN_PRIORITY_CATS:
        remaining = MAX_PER_CATEGORY - category_counts[cat]
        if remaining > 0:
            final += fill_category_from(cn_articles, cat, remaining)

    # Step 3: business / product 优先中文
    for cat in ("business", "product"):
        final += fill_category_from(cn_articles, cat, 2)

    # Step 4: business / product 英文补位
    for cat in ("business", "product"):
        remaining = MAX_PER_CATEGORY - category_counts[cat]
        if remaining > 0:
            final += fill_category_from(en_articles, cat, remaining)

    # Step 5: 总数不够，从英文池补充（不限分类）
    if len(final) < 10:
        for article in en_articles:
            if len(final) >= TARGET_TOTAL:
                break
            if article not in final:
                cat = article["category"]
                if category_counts[cat] < MAX_PER_CATEGORY:
                    category_counts[cat] += 1
                    final.append(article)

    # Step 6: 还不到10，中文池兜底
    if len(final) < 10:
        for article in cn_articles:
            if len(final) >= TARGET_TOTAL:
                break
            if article not in final:
                cat = article["category"]
                if category_counts[cat] < MAX_PER_CATEGORY:
                    category_counts[cat] += 1
                    final.append(article)

    # 翻译英文文章
    final = translate_articles(final)

    # 统计最终比例
    cn_final = sum(1 for a in final if a.get("isNativeCN"))
    en_final = len(final) - cn_final
    print(f"✅ 最终: {len(final)} 条 (中文源 {cn_final} / 英文源 {en_final})")

    # 添加 rank
    for i, article in enumerate(final):
        article["score"] = article.get("score", 0)
        article["rank"] = i + 1

    return final


def main():
    today_str = datetime.now(TZ_SHANGHAI).strftime("%Y-%m-%d")
    print(f"\n📡 开始抓取 {today_str} AI 热点新闻...\n")

    # 1. 抓取
    candidates = fetch_all_sources()
    print(f"\n📥 原始候选: {len(candidates)} 条")

    # 2. 去重
    unique = deduplicate(candidates)
    print(f"🔍 去重后: {len(unique)} 条")

    # 3. 处理
    final = process_articles(unique)
    print(f"✨ 最终输出: {len(final)} 条\n")
    for i, article in enumerate(final):
        print(f"  {i+1}. [{article['categoryLabel']}] {article['title'][:60]}...")

    # 4. 输出 JSON
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output = {
        "date": today_str,
        "generated": datetime.now(TZ_SHANGHAI).isoformat(),
        "total": len(final),
        "defaultDisplay": DEFAULT_DISPLAY,
        "news": final,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已生成: {OUTPUT_FILE}")

    # 5. 同步到 Supabase（即使失败也不影响本地 JSON 落盘与后续 git 提交）
    try:
        sync_to_supabase(final, today_str)
    except Exception as e:
        print(f"⚠ Supabase 同步整体失败（不影响本地 JSON 更新）: {e}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
