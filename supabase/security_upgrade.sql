-- Run once in Supabase SQL Editor after schema.sql/update_schema.sql.
create type public.app_role as enum ('free', 'plus', 'admin');
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null, role public.app_role not null default 'free', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.search_usage (
  user_id uuid primary key references auth.users(id) on delete cascade, month_start date not null default date_trunc('month', now())::date,
  month_count integer not null default 0, day_start date not null default current_date, day_count integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.rate_limits (
  subject text not null, action text not null, window_start timestamptz not null, count integer not null default 0, primary key(subject, action, window_start)
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null, action text not null, ip_hash text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, message text not null check (char_length(message) between 10 and 4000), page text, status text not null default 'new', created_at timestamptz not null default now()
);
alter table public.watchlist add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists push_subscriptions_user_endpoint_idx on public.push_subscriptions(user_id, (subscription->>'endpoint'));
create index if not exists watchlist_user_added_idx on public.watchlist(user_id, added_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,email) values(new.id, coalesce(new.email,'')) on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.consume_rate_limit(p_subject text,p_action text,p_window_seconds integer,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$ declare bucket timestamptz:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds); begin insert into rate_limits(subject,action,window_start,count) values(p_subject,p_action,bucket,1) on conflict(subject,action,window_start) do update set count=rate_limits.count+1 where rate_limits.count<p_limit; return found; end; $$;
create or replace function public.consume_search_quota(p_user_id uuid,p_monthly_limit integer,p_daily_limit integer) returns jsonb language plpgsql security definer set search_path=public as $$ declare row search_usage%rowtype; begin insert into search_usage(user_id) values(p_user_id) on conflict(user_id) do nothing; select * into row from search_usage where user_id=p_user_id for update; if row.month_start<>date_trunc('month',now())::date then update search_usage set month_start=date_trunc('month',now())::date,month_count=0 where user_id=p_user_id returning * into row; end if; if row.day_start<>current_date then update search_usage set day_start=current_date,day_count=0 where user_id=p_user_id returning * into row; end if; if row.month_count>=p_monthly_limit or row.day_count>=p_daily_limit then return jsonb_build_object('allowed',false,'remaining',greatest(0,p_monthly_limit-row.month_count),'reset_at',(row.month_start+interval '1 month')::text); end if; update search_usage set month_count=month_count+1,day_count=day_count+1,updated_at=now() where user_id=p_user_id; return jsonb_build_object('allowed',true,'remaining',p_monthly_limit-row.month_count-1,'reset_at',(row.month_start+interval '1 month')::text); end; $$;

alter table public.profiles enable row level security; alter table public.watchlist enable row level security; alter table public.push_subscriptions enable row level security; alter table public.search_usage enable row level security; alter table public.audit_logs enable row level security; alter table public.bug_reports enable row level security;
create policy "profile owner reads" on public.profiles for select using (auth.uid()=id);
create policy "watchlist owner" on public.watchlist for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "subscription owner" on public.push_subscriptions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "usage owner reads" on public.search_usage for select using (auth.uid()=user_id);
create policy "report owner creates" on public.bug_reports for insert with check (auth.uid()=user_id);
-- price_cache, rate_limits, audit_logs, and provider configuration have no browser policies.
