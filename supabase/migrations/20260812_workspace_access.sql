-- 多设备同步与指定邮箱邀请码。自动选择历史个人数据最多的既有身份作为 owner。
do $$ declare owner_id uuid; begin
  create table if not exists public.workspace_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('owner','member')), status text not null default 'active' check (status in ('active','revoked')),
    created_at timestamptz not null default now()
  );
  create table if not exists public.workspace_invitations (
    id uuid primary key default gen_random_uuid(), email text not null, token_hash text not null unique,
    status text not null default 'pending' check (status in ('pending','accepted','revoked')),
    expires_at timestamptz not null, accepted_at timestamptz, accepted_by uuid references auth.users(id), created_at timestamptz not null default now()
  );
  select user_id into owner_id from public.user_data where user_id is not null group by user_id order by count(*) desc, max(updated_at) desc limit 1;
  if owner_id is null then raise exception '未找到可迁移的既有个人身份'; end if;
  insert into public.workspace_members(user_id,role,status) values(owner_id,'owner','active') on conflict (user_id) do update set role='owner',status='active';
end $$;

create or replace function public.is_workspace_member() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from workspace_members where user_id=auth.uid() and status='active')
$$;
create or replace function public.is_workspace_owner() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from workspace_members where user_id=auth.uid() and role='owner' and status='active')
$$;

alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
create policy "members read self or owner" on public.workspace_members for select using (user_id=auth.uid() or public.is_workspace_owner());
create policy "owners read invitations" on public.workspace_invitations for select using (public.is_workspace_owner());

create or replace function public.redeem_workspace_invite(invite_hash text) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare invitation public.workspace_invitations%rowtype; email_value text := lower(coalesce(auth.jwt()->>'email',''));
begin
  if auth.uid() is null or email_value='' then raise exception '请先通过邮件登录'; end if;
  select * into invitation from public.workspace_invitations where token_hash=invite_hash and status='pending' for update;
  if not found then raise exception '邀请链接无效或已使用'; end if;
  if invitation.expires_at <= now() then raise exception '邀请链接已过期'; end if;
  if lower(invitation.email) <> email_value then raise exception '该邀请仅限指定邮箱使用'; end if;
  insert into public.workspace_members(user_id,role,status) values(auth.uid(),'member','active') on conflict(user_id) do update set status='active';
  update public.workspace_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=invitation.id;
  return jsonb_build_object('ok',true);
end $$;
grant execute on function public.redeem_workspace_invite(text) to authenticated;

do $$ declare table_name text; policy_row record; begin
  foreach table_name in array array['user_data','checkins','fitness_exercises','fitness_weekly_plans','fitness_plan_items','fitness_checkins'] loop
    for policy_row in select policyname from pg_policies where schemaname='public' and tablename=table_name loop execute format('drop policy if exists %I on public.%I',policy_row.policyname,table_name); end loop;
    execute format('create policy %I on public.%I for all using (auth.uid()=user_id and public.is_workspace_member()) with check (auth.uid()=user_id and public.is_workspace_member())','member personal data',table_name);
  end loop;
end $$;
