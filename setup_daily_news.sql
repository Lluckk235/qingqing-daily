-- ============================================
-- 卿卿日常 · 每日热点资讯 Supabase 表
-- 复制到 Supabase SQL Editor 执行
-- ============================================

-- 1. 创建表
CREATE TABLE IF NOT EXISTS daily_news (
  id            TEXT PRIMARY KEY,
  news_date     DATE NOT NULL,
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  source        TEXT NOT NULL,
  published_at  TIMESTAMPTZ DEFAULT now(),
  summary       JSONB DEFAULT '[]'::jsonb,
  why_important TEXT DEFAULT '',
  url           TEXT NOT NULL,
  rank          INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. 索引（按日期 + 排序查询）
CREATE INDEX IF NOT EXISTS idx_daily_news_date  ON daily_news (news_date);
CREATE INDEX IF NOT EXISTS idx_daily_news_rank  ON daily_news (news_date, rank);

-- 3. 开启 RLS
ALTER TABLE daily_news ENABLE ROW LEVEL SECURITY;

-- 4. 允许公开读取
CREATE POLICY "Allow public read daily_news"
  ON daily_news FOR SELECT
  USING (true);

-- 5. 不允许公开写入（service_role 默认绕过 RLS，无需额外策略）
-- 写入通过 GitHub Actions 使用 SUPABASE_SERVICE_ROLE_KEY 完成
