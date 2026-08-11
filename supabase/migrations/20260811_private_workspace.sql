-- 卿卿日常：个人数据隔离与健身模块
-- 执行前：在 Supabase Table Editor 导出 user_data、checkins 两张表。
-- 1) 发布新版，在自己的原浏览器打开一次；控制台执行 Supabase.userId 复制 UUID。
-- 2) 用该 UUID 替换下方 owner_id。确认不是朋友浏览器的 UUID 后再执行本脚本。

-- 数据库内备份：不开放 API 访问，仅项目管理员可在 Dashboard 查询。
create table if not exists public.user_data_backup_20260811 as table public.user_data;
create table if not exists public.checkins_backup_20260811 as table public.checkins;
alter table public.user_data_backup_20260811 enable row level security;
alter table public.checkins_backup_20260811 enable row level security;
revoke all on public.user_data_backup_20260811 from anon, authenticated;
revoke all on public.checkins_backup_20260811 from anon, authenticated;

do $$
declare
  owner_id uuid := '00000000-0000-0000-0000-000000000000'; -- 必须替换
  policy_row record;
  constraint_row record;
begin
  if owner_id = '00000000-0000-0000-0000-000000000000' then
    raise exception '请先将 owner_id 替换为你原浏览器的 Supabase.userId';
  end if;
  if not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'owner_id 不存在于 auth.users，请先在新版网站创建匿名身份';
  end if;

  alter table public.user_data add column if not exists user_id uuid references auth.users(id);
  alter table public.checkins add column if not exists user_id uuid references auth.users(id);
  update public.user_data set user_id = owner_id where user_id is null;
  update public.checkins set user_id = owner_id where user_id is null;

  -- user_data 过去以 key 全局唯一；改为每个匿名身份各自拥有同名 key。
  for constraint_row in
    select conname from pg_constraint
    where conrelid = 'public.user_data'::regclass and contype in ('p', 'u')
      and pg_get_constraintdef(oid) like '%key%'
  loop
    execute format('alter table public.user_data drop constraint %I', constraint_row.conname);
  end loop;
  alter table public.user_data alter column user_id set not null;
  alter table public.user_data add constraint user_data_user_id_key_key unique (user_id, key);

  -- checkins 的 date 过去全局唯一；改为每个身份每天一条。
  for constraint_row in
    select conname from pg_constraint
    where conrelid = 'public.checkins'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) like '%date%'
  loop
    execute format('alter table public.checkins drop constraint %I', constraint_row.conname);
  end loop;
  alter table public.checkins alter column user_id set not null;
  alter table public.checkins add constraint checkins_user_id_date_key unique (user_id, date);

  -- 彻底移除旧公开策略，避免朋友继续读取或覆盖个人记录。
  for policy_row in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('user_data', 'checkins') loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

-- 如果旧策略同名存在，上方循环已删除；下面为唯一可用的个人数据策略。
alter table public.user_data enable row level security;
alter table public.checkins enable row level security;
create policy "personal user_data" on public.user_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "personal checkins" on public.checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.fitness_exercises (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_url text not null, platform text not null check (platform in ('douyin', 'bilibili')),
  title text not null, cover_url text, creator text, training_type text, body_parts text[] not null default '{}',
  intensity smallint check (intensity between 1 and 5), duration_minutes integer check (duration_minutes > 0),
  tags text[] not null default '{}', notes text, metadata_status text not null default 'manual', is_archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.fitness_weekly_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null, created_at timestamptz not null default now(), unique(user_id, week_start)
);
create table if not exists public.fitness_plan_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.fitness_weekly_plans(id) on delete cascade,
  exercise_id uuid not null references public.fitness_exercises(id), sort_order integer not null default 0,
  created_at timestamptz not null default now(), unique(plan_id, exercise_id)
);
create table if not exists public.fitness_checkins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.fitness_weekly_plans(id) on delete cascade,
  plan_item_id uuid not null references public.fitness_plan_items(id) on delete cascade,
  completed_at timestamptz not null default now(), duration_minutes integer check (duration_minutes > 0),
  perceived_exertion smallint check (perceived_exertion between 1 and 5), note text, unique(plan_item_id)
);

alter table public.fitness_exercises enable row level security;
alter table public.fitness_weekly_plans enable row level security;
alter table public.fitness_plan_items enable row level security;
alter table public.fitness_checkins enable row level security;
create policy "personal fitness_exercises" on public.fitness_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "personal fitness_weekly_plans" on public.fitness_weekly_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "personal fitness_plan_items" on public.fitness_plan_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "personal fitness_checkins" on public.fitness_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 防止已登录用户将自己的清单项指向其他身份的计划或动作。
create or replace function public.enforce_fitness_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'fitness_plan_items' and not exists (
    select 1 from fitness_weekly_plans plan join fitness_exercises exercise on exercise.id = new.exercise_id
    where plan.id = new.plan_id and plan.user_id = new.user_id and exercise.user_id = new.user_id
  ) then raise exception '计划和动作必须属于同一用户'; end if;
  if tg_table_name = 'fitness_checkins' and not exists (
    select 1 from fitness_weekly_plans plan join fitness_plan_items item on item.id = new.plan_item_id
    where plan.id = new.plan_id and plan.user_id = new.user_id and item.plan_id = new.plan_id and item.user_id = new.user_id
  ) then raise exception '打卡必须属于同一用户的计划项'; end if;
  return new;
end $$;
create trigger fitness_plan_items_owner before insert or update on public.fitness_plan_items for each row execute function public.enforce_fitness_owner();
create trigger fitness_checkins_owner before insert or update on public.fitness_checkins for each row execute function public.enforce_fitness_owner();

-- Supabase Dashboard > Authentication > Providers：启用 Anonymous Sign-Ins。
