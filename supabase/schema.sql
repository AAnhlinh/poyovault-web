-- PoyoVault — Supabase schema
-- Run this in the Supabase SQL editor before seeding.
-- Every customer-owned table is protected by Row Level Security:
-- authenticated users can only read and write rows where auth.uid() = user_id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  plan text not null default 'PoyoVault Premium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Connected financial accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit_card', 'loan')),
  mask text not null default '0000',
  balance numeric(14, 2) not null default 0,
  accent text not null default '#6366F1',
  logo text not null default 'FS',
  credit_limit numeric(14, 2),
  apr numeric(7, 4),
  minimum_payment numeric(12, 2),
  due_day smallint check (due_day is null or (due_day between 1 and 31)),
  original_balance numeric(14, 2),
  term_months integer,
  remaining_months integer,
  loan_kind text check (loan_kind is null or loan_kind in ('mortgage', 'auto', 'student', 'personal')),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  merchant text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  type text not null check (type in ('expense', 'income')),
  occurred_at timestamptz not null,
  recurring boolean not null default false,
  is_subscription boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_account_idx on public.transactions (account_id);

-- ---------------------------------------------------------------------------
-- Savings goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  target numeric(14, 2) not null check (target > 0),
  saved numeric(14, 2) not null default 0 check (saved >= 0),
  target_date date,
  account_id uuid references public.accounts (id) on delete set null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  color text not null default '#5EEAD4',
  icon text not null default 'sparkles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- Preferences and privacy controls
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  personalized_offers boolean not null default true,
  ai_analysis boolean not null default true,
  product_analytics boolean not null default false,
  third_party_sharing boolean not null default false,
  weekly_digest boolean not null default true,
  bill_reminders boolean not null default true,
  goal_milestones boolean not null default true,
  enrolled_challenges text[] not null default '{}',
  cancelled_subscriptions text[] not null default '{}',
  dining_budget numeric(10, 2) not null default 450,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Advisor conversation
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  suggestions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Incoming call log and area-code blocklist
-- ---------------------------------------------------------------------------
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  caller_name text not null,
  phone_number text not null,
  direction text not null default 'incoming' check (direction in ('incoming', 'outgoing')),
  started_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  transcript text not null,
  scam_score integer not null check (scam_score between 0 and 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  headline text not null default '',
  summary text not null default '',
  findings jsonb not null default '[]'::jsonb,
  location_mismatch boolean not null default false,
  caller_area_code text,
  caller_state text,
  caller_city text,
  caller_location text,
  network_ip text,
  network_country text,
  network_region text,
  network_city text,
  network_location text,
  network_source text,
  blocked boolean not null default false,
  block_reason text,
  source text not null default 'test_dialer' check (source in ('test_dialer', 'live')),
  created_at timestamptz not null default now()
);

create index if not exists call_logs_user_started_idx
  on public.call_logs (user_id, started_at desc);

create table if not exists public.blocked_area_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_code text not null check (area_code ~ '^[2-9][0-9]{2}$'),
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, area_code)
);

create index if not exists blocked_area_codes_user_idx
  on public.blocked_area_codes (user_id);

-- ---------------------------------------------------------------------------
-- Partner rewards catalogue (read-only to authenticated customers)
-- ---------------------------------------------------------------------------
create table if not exists public.partner_offers (
  id text primary key,
  partner text not null,
  tagline text not null,
  description text not null,
  discount text not null,
  category text not null,
  expires_at date not null,
  eligibility text not null,
  sponsored boolean not null default false,
  accent text not null default '#38BDF8',
  savings_model text check (savings_model in ('percent', 'flat')),
  savings_value numeric(10, 4),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.user_preferences enable row level security;
alter table public.chat_messages enable row level security;
alter table public.call_logs enable row level security;
alter table public.blocked_area_codes enable row level security;
alter table public.partner_offers enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users manage own accounts" on public.accounts;
create policy "Users manage own accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own conversation" on public.chat_messages;
create policy "Users manage own conversation"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own call log" on public.call_logs;
create policy "Users manage own call log"
  on public.call_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own blocked area codes" on public.blocked_area_codes;
create policy "Users manage own blocked area codes"
  on public.blocked_area_codes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users read offers" on public.partner_offers;
create policy "Authenticated users read offers"
  on public.partner_offers for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + privacy defaults
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Customer'), '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh where it exists.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
  before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists preferences_touch_updated_at on public.user_preferences;
create trigger preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();
