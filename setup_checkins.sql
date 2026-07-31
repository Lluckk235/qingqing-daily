-- 打卡签到表
-- 请在 Supabase SQL Editor 中运行此脚本
-- Supabase 项目: https://supabase.com/dashboard/project/prpyjwxrovckkpzwytgw

CREATE TABLE IF NOT EXISTS checkins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 允许公开读取（前端可查询打卡记录）
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON checkins FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON checkins FOR INSERT WITH CHECK (true);
