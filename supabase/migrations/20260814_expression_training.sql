-- 表达训练：个人练习卡与每周公共灵感。执行前不删除任何旧 expression_today 数据。
create table if not exists public.expression_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  input_text text,
  source_url text,
  source_title text,
  source_summary text,
  card jsonb not null,
  variants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expression_cards_user_updated_idx on public.expression_cards(user_id, updated_at desc);

create table if not exists public.expression_weekly_ideas (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  category text not null check (category in ('个人成长', '女性成长', 'AI 工具')),
  title text not null,
  brief text not null,
  source_name text not null,
  source_url text,
  sort_order smallint not null check (sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  unique(week_start, sort_order)
);
create index if not exists expression_weekly_ideas_week_idx on public.expression_weekly_ideas(week_start, sort_order);

alter table public.expression_cards enable row level security;
alter table public.expression_weekly_ideas enable row level security;
drop policy if exists "member expression cards" on public.expression_cards;
create policy "member expression cards" on public.expression_cards for all
  using (auth.uid() = user_id and public.is_workspace_member())
  with check (auth.uid() = user_id and public.is_workspace_member());
drop policy if exists "members read weekly expression ideas" on public.expression_weekly_ideas;
create policy "members read weekly expression ideas" on public.expression_weekly_ideas for select
  using (public.is_workspace_member());
