#!/usr/bin/env python3
"""每周表达灵感：只使用精选中文公开 RSS，不保存整篇文章。"""
import json
import os
from datetime import datetime, timedelta, timezone

import feedparser
import requests

SUPABASE_URL = 'https://prpyjwxrovckkpzwytgw.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
DEEPSEEK_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
SOURCES = [
    {'name': '少数派', 'url': 'https://sspai.com/feed'},
    {'name': '36氪', 'url': 'https://36kr.com/feed'},
    {'name': '虎嗅', 'url': 'https://www.huxiu.com/rss/0.xml'},
    {'name': '极客公园', 'url': 'https://www.geekpark.net/rss'},
]

def clean(value, limit=700):
    return ' '.join(str(value or '').replace('<', ' ').replace('>', ' ').split())[:limit]

def week_start():
    now = datetime.now(timezone(timedelta(hours=8))).date()
    return (now - timedelta(days=now.weekday())).isoformat()

def candidates():
    result = []
    for source in SOURCES:
        try:
            feed = feedparser.parse(source['url'])
            for entry in feed.entries[:12]:
                title, summary = clean(entry.get('title'), 160), clean(entry.get('summary', entry.get('description')), 500)
                if title and summary:
                    result.append({'source_name': source['name'], 'source_url': entry.get('link', ''), 'title': title, 'summary': summary})
        except Exception as error:
            print(f"skip {source['name']}: {error}")
    return result[:32]

def generate(items):
    if not DEEPSEEK_KEY:
        raise RuntimeError('missing DEEPSEEK_API_KEY')
    prompt = '''你为一个中文女性短视频表达训练工作台筛选每周练习题。\n只能基于下列公开文章候选做启发，不能编造事实；最终题目必须适合真人露脸加辅助画面练习。\n生成严格 JSON 数组，固定 8 项：前 7 项 category 只能是“个人成长”或“女性成长”，最后 1 项 category 必须是“AI 工具”。不要新闻播报、成功学或鸡汤。\n每项字段：category,title,brief,source_name,source_url。brief 解释可讲的具体处境或观察，最多80字。\n候选：''' + json.dumps(items, ensure_ascii=False)
    response = requests.post('https://api.deepseek.com/chat/completions', timeout=60, headers={'Authorization': f'Bearer {DEEPSEEK_KEY}', 'Content-Type': 'application/json'}, json={'model': os.environ.get('DEEPSEEK_EXPRESSION_MODEL', 'deepseek-chat'), 'temperature': .7, 'response_format': {'type': 'json_object'}, 'messages': [{'role': 'user', 'content': prompt}]})
    response.raise_for_status()
    content = response.json()['choices'][0]['message']['content']
    parsed = json.loads(content)
    ideas = parsed.get('ideas', parsed if isinstance(parsed, list) else [])
    if len(ideas) != 8:
        raise RuntimeError('model did not return 8 ideas')
    return ideas

def sync(ideas):
    if not SUPABASE_KEY:
        raise RuntimeError('missing SUPABASE_SERVICE_ROLE_KEY')
    week = week_start()
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
    response = requests.delete(f'{SUPABASE_URL}/rest/v1/expression_weekly_ideas?week_start=eq.{week}', headers=headers, timeout=30)
    response.raise_for_status()
    rows = [{'week_start': week, 'sort_order': index, 'category': clean(item.get('category'), 20), 'title': clean(item.get('title'), 180), 'brief': clean(item.get('brief'), 180), 'source_name': clean(item.get('source_name'), 80), 'source_url': clean(item.get('source_url'), 1000) or None} for index, item in enumerate(ideas)]
    response = requests.post(f'{SUPABASE_URL}/rest/v1/expression_weekly_ideas', headers={**headers, 'Prefer': 'return=minimal'}, json=rows, timeout=30)
    response.raise_for_status()

if __name__ == '__main__':
    source_items = candidates()
    if len(source_items) < 6:
        raise SystemExit('not enough public source entries')
    ideas = generate(source_items)
    sync(ideas)
    print(f'updated {len(ideas)} expression ideas for {week_start()}')
