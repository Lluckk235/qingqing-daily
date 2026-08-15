-- 灵感集：公开视频参考、拆解结果与参考拍摄稿。
-- 不修改任何既有表达训练数据。

create table if not exists public.inspiration_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  transcript text not null,
  image_paths jsonb not null default '[]'::jsonb,
  title text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  analysis jsonb,
  shooting_script jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspiration_items_user_updated_idx
  on public.inspiration_items(user_id, updated_at desc);

alter table public.inspiration_items enable row level security;
drop policy if exists "member inspiration items" on public.inspiration_items;
create policy "member inspiration items" on public.inspiration_items for all
  using (auth.uid() = user_id and public.is_workspace_member())
  with check (auth.uid() = user_id and public.is_workspace_member());

-- 截图只允许所属账号读取。对象路径固定为 <user_id>/<random-id>/<file>。
insert into storage.buckets (id, name, public)
values ('inspiration-assets', 'inspiration-assets', false)
on conflict (id) do update set public = false;

drop policy if exists "member inspiration asset select" on storage.objects;
create policy "member inspiration asset select" on storage.objects for select
  using (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_workspace_member()
  );

drop policy if exists "member inspiration asset insert" on storage.objects;
create policy "member inspiration asset insert" on storage.objects for insert
  with check (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_workspace_member()
  );

drop policy if exists "member inspiration asset delete" on storage.objects;
create policy "member inspiration asset delete" on storage.objects for delete
  using (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_workspace_member()
  );
