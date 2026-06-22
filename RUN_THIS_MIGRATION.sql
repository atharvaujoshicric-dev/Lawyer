-- ════════════════════════════════════════════════════════
--  LexDesk — RUN THIS FILE NOW
--  Run this whether you're on the original schema or already
--  ran a previous migration — every statement below is safe
--  to run more than once.
--
--  Go to: Supabase Project → SQL Editor → New Query →
--  paste this entire file → Run
-- ════════════════════════════════════════════════════════

-- ── Fix #1: lets every approved team member see each other ──
-- (this is why Assistants couldn't see anyone in 1:1 chat)
drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_select_approved_or_self" on profiles;
create policy "profiles_select_approved_or_self" on profiles for select
  using (id = auth.uid() or is_admin() or (approved = true and is_approved()));

-- ── Fix #2: adds the "In Review" task status ──
-- (this is why "Send for Review" failed with a check constraint error)
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open','in_progress','in_review','done','cancelled'));

-- ── Fix #3: lets messages be edited/deleted, sender-only, within 5 minutes ──
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted boolean default false;
drop policy if exists "messages_update" on messages;
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));

-- ── New: multiple cases per client (contact linking) ──
alter table clients add column if not exists contact_id text references clients(client_id);

-- ── New: fee ledger (multiple dated payments per case, running balance) ──
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  client_id text references clients(client_id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  method text,
  note text,
  recorded_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table payments enable row level security;
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (is_admin() or exists(select 1 from clients c where c.client_id = payments.client_id and c.assigned_to = auth.uid()));
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (is_admin() or exists(select 1 from clients c where c.client_id = payments.client_id and c.assigned_to = auth.uid()));
drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update
  using (is_admin() or recorded_by = auth.uid());
drop policy if exists "payments_delete" on payments;
create policy "payments_delete" on payments for delete
  using (is_admin() or recorded_by = auth.uid());

-- ── New: Daily Planner manual notes (tasks/deadlines pulled in live by the app) ──
create table if not exists planner_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) not null,
  note_date date not null default current_date,
  time text,
  content text not null,
  done boolean default false,
  created_at timestamptz default now()
);
alter table planner_notes enable row level security;
drop policy if exists "planner_select" on planner_notes;
create policy "planner_select" on planner_notes for select using (owner_id = auth.uid());
drop policy if exists "planner_insert" on planner_notes;
create policy "planner_insert" on planner_notes for insert with check (owner_id = auth.uid());
drop policy if exists "planner_update" on planner_notes;
create policy "planner_update" on planner_notes for update using (owner_id = auth.uid());
drop policy if exists "planner_delete" on planner_notes;
create policy "planner_delete" on planner_notes for delete using (owner_id = auth.uid());

-- ── New: OneDrive per-user token storage (for when you wire up the Client ID) ──
create table if not exists onedrive_tokens (
  user_id uuid primary key references profiles(id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  root_folder_id text,
  updated_at timestamptz default now()
);
alter table onedrive_tokens enable row level security;
drop policy if exists "onedrive_tokens_all" on onedrive_tokens;
create policy "onedrive_tokens_all" on onedrive_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Sanity checks — run after the above, confirm results look right ──
select policyname from pg_policies where tablename = 'profiles';
select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'tasks_status_check';
select column_name from information_schema.columns where table_name = 'clients' and column_name = 'contact_id';
select table_name from information_schema.tables where table_name in ('payments','planner_notes','onedrive_tokens');

-- ── Enable Supabase Realtime for live message and task push ──────────────
-- This allows the app to receive instant push notifications without
-- polling. Run this block even if you've run earlier migrations.
-- In Supabase, realtime publication is managed via the supabase_realtime
-- publication on the postgres replication slot.

-- Enable realtime for messages table
alter publication supabase_realtime add table messages;

-- Enable realtime for tasks table
alter publication supabase_realtime add table tasks;

-- If you get "relation already exists in publication" errors, those tables
-- are already enabled — that's fine, the rest of the migration still ran.
