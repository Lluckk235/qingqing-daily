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
CN_MIN_RATIO = 0.5  # 至少 50% 中文
DEFAULT_DISPLAY = 6

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


def relative_time(published_str: str) -> str:
    """将发布时间转为相对时间描述"""
    try:
        # 尝试多种时间格式
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
                break
            except ValueError:
                continue
        else:
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
    """将新闻数据写入 Supabase（先清当天旧数据，再批量插入）"""
    if not SYNC_TO_SUPABASE:
        print("⏭ 跳过 Supabase 同步（未设置 SUPABASE_SERVICE_ROLE_KEY）")
        return

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    # 1. 删除当天旧数据
    try:
        del_url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?news_date=eq.{today_str}"
        resp = requests.delete(del_url, headers=headers, timeout=15)
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

        try:
            pub_dt = datetime.strptime(article["published_raw"], "%a, %d %b %Y %H:%M:%S %z")
        except Exception:
            try:
                pub_dt = datetime.strptime(article["published_raw"], "%Y-%m-%dT%H:%M:%S%z")
            except Exception:
                pub_dt = now - timedelta(hours=12)

        hours_ago = (now - pub_dt).total_seconds() / 3600
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
                "relativeTime": rel_time,
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

    # 最终选择：优先填中文，不够用英文补
    cn_slots = max(int(TARGET_TOTAL * CN_MIN_RATIO), 4)  # 至少 4 条中文
    en_slots = TARGET_TOTAL - cn_slots

    category_counts = {k: 0 for k in CATEGORY_RULES}
    final = []

    def fill_from(pool, slots):
        """从池中选文章，每类不超过 MAX_PER_CATEGORY"""
        filled = []
        for article in pool:
            if len(filled) >= slots:
                break
            cat = article["category"]
            if category_counts[cat] < MAX_PER_CATEGORY:
                category_counts[cat] += 1
                filled.append(article)
        return filled

    # 先填中文槽位
    final = fill_from(cn_articles, cn_slots)
    actual_cn = len(final)

    # 剩余的英文槽位（如果中文不够，英文可以多填）
    remaining = TARGET_TOTAL - actual_cn
    final += fill_from(en_articles, remaining)

    # 翻译英文文章
    final = translate_articles(final)

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

    # 5. 同步到 Supabase
    sync_to_supabase(final, today_str)

    return 0


if __name__ == "__main__":
    sys.exit(main())
