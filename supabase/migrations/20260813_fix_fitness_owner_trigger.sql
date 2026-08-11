-- 修复：PostgreSQL 不保证 AND 的短路执行。
-- 原函数在写入 fitness_plan_items 时仍会读取 NEW.plan_item_id（该字段只存在于 fitness_checkins），从而返回 42703 / HTTP 400。
create or replace function public.enforce_fitness_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'fitness_plan_items' then
    if not exists (
      select 1
      from fitness_weekly_plans plan
      join fitness_exercises exercise on exercise.id = new.exercise_id
      where plan.id = new.plan_id
        and plan.user_id = new.user_id
        and exercise.user_id = new.user_id
    ) then
      raise exception '计划和动作必须属于同一用户';
    end if;
  elsif tg_table_name = 'fitness_checkins' then
    if not exists (
      select 1
      from fitness_weekly_plans plan
      join fitness_plan_items item on item.id = new.plan_item_id
      where plan.id = new.plan_id
        and plan.user_id = new.user_id
        and item.plan_id = new.plan_id
        and item.user_id = new.user_id
    ) then
      raise exception '打卡必须属于同一用户的计划项';
    end if;
  end if;

  return new;
end;
$$;
