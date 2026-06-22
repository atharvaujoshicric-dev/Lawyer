-- ════════════════════════════════════════════════════════
--  LexDesk — FULL MIGRATION (all versions)
--  Safe to run more than once on any existing install.
--  Supabase → SQL Editor → New Query → paste → Run
-- ════════════════════════════════════════════════════════

-- ────────────────────────────────────────────
--  HELPER FUNCTIONS
-- ────────────────────────────────────────────
create or replace function is_admin() returns boolean as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and approved = true
  );
$$ language sql security definer stable;

create or replace function is_approved() returns boolean as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and approved = true
  );
$$ language sql security definer stable;

-- Breaks the notes ↔ note_shares RLS circular dependency.
-- Called inside note policies — runs as the function owner (bypasses RLS)
-- so it can read note_shares without triggering notes policy again.
create or replace function user_has_note_share(p_note_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from note_shares
    where note_id = p_note_id and shared_with = p_user_id
  );
$$ language sql security definer stable;

create or replace function user_has_note_editor_share(p_note_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from note_shares
    where note_id = p_note_id and shared_with = p_user_id and permission = 'editor'
  );
$$ language sql security definer stable;

-- Used inside note_shares policies — reads notes without triggering
-- note_shares policy again.
create or replace function user_owns_note(p_note_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from notes
    where id = p_note_id and owner_id = p_user_id
  );
$$ language sql security definer stable;

-- ────────────────────────────────────────────
--  v3.1 fixes
-- ────────────────────────────────────────────
drop policy if exists "profiles_select_own_or_admin"     on profiles;
drop policy if exists "profiles_select_approved_or_self" on profiles;
create policy "profiles_select_approved_or_self" on profiles for select
  using (id = auth.uid() or is_admin() or (approved = true and is_approved()));

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open','in_progress','in_review','done','cancelled'));

alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted   boolean default false;
drop policy if exists "messages_update" on messages;
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));

-- ────────────────────────────────────────────
--  v3.2 additions
-- ────────────────────────────────────────────
alter table clients add column if not exists contact_id text
  references clients(client_id);

create table if not exists payments (
  id           uuid    primary key default gen_random_uuid(),
  client_id    text    references clients(client_id) on delete cascade,
  amount       numeric not null check (amount > 0),
  payment_date date    not null default current_date,
  method       text,
  note         text,
  recorded_by  uuid    references profiles(id),
  created_at   timestamptz default now()
);
alter table payments enable row level security;
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (is_admin() or exists(
    select 1 from clients c
    where c.client_id = payments.client_id and c.assigned_to = auth.uid()
  ));
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (is_admin() or exists(
    select 1 from clients c
    where c.client_id = payments.client_id and c.assigned_to = auth.uid()
  ));
drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update
  using (is_admin() or recorded_by = auth.uid());
drop policy if exists "payments_delete" on payments;
create policy "payments_delete" on payments for delete
  using (is_admin() or recorded_by = auth.uid());

create table if not exists planner_notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id) not null,
  note_date  date not null default current_date,
  time       text,
  content    text not null,
  done       boolean default false,
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

create table if not exists onedrive_tokens (
  user_id        uuid primary key references profiles(id) on delete cascade,
  access_token   text,
  refresh_token  text,
  expires_at     timestamptz,
  root_folder_id text,
  updated_at     timestamptz default now()
);
alter table onedrive_tokens enable row level security;
drop policy if exists "onedrive_tokens_all" on onedrive_tokens;
create policy "onedrive_tokens_all" on onedrive_tokens for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — message read receipts
-- ────────────────────────────────────────────
create table if not exists message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  read_at    timestamptz default now(),
  primary key (message_id, user_id)
);
alter table message_reads enable row level security;
drop policy if exists "mreads_select" on message_reads;
create policy "mreads_select" on message_reads for select using (user_id = auth.uid());
drop policy if exists "mreads_insert" on message_reads;
create policy "mreads_insert" on message_reads for insert with check (user_id = auth.uid());
drop policy if exists "mreads_delete" on message_reads;
create policy "mreads_delete" on message_reads for delete using (user_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — note_shares  (created FIRST, no FK to notes yet)
-- ────────────────────────────────────────────
create table if not exists note_shares (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid,          -- FK added below after notes exists
  shared_with uuid references profiles(id) on delete cascade,
  permission  text not null check (permission in ('viewer','editor')),
  shared_by   uuid references profiles(id),
  shared_at   timestamptz default now(),
  unique (note_id, shared_with)
);
alter table note_shares enable row level security;

-- note_shares policies use user_owns_note() — no direct subquery on notes,
-- so no recursion here.
drop policy if exists "nshares_select" on note_shares;
create policy "nshares_select" on note_shares for select
  using (shared_with = auth.uid() or user_owns_note(note_id, auth.uid()));

drop policy if exists "nshares_insert" on note_shares;
create policy "nshares_insert" on note_shares for insert
  with check (user_owns_note(note_id, auth.uid()));

drop policy if exists "nshares_update" on note_shares;
create policy "nshares_update" on note_shares for update
  using (user_owns_note(note_id, auth.uid()));

drop policy if exists "nshares_delete" on note_shares;
create policy "nshares_delete" on note_shares for delete
  using (user_owns_note(note_id, auth.uid()));

-- ────────────────────────────────────────────
--  v3.3 — notes  (created after note_shares)
-- ────────────────────────────────────────────
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id) not null,
  title      text not null,
  content    text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;

-- Add FK from note_shares → notes (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'note_shares_note_id_fkey'
      and table_name = 'note_shares'
  ) then
    alter table note_shares
      add constraint note_shares_note_id_fkey
      foreign key (note_id) references notes(id) on delete cascade;
  end if;
end $$;

-- notes policies use user_has_note_share() / user_has_note_editor_share()
-- — security definer functions that read note_shares bypassing RLS,
-- so no recursion back into the notes policy.
drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes for select
  using (
    owner_id = auth.uid()
    or user_has_note_share(id, auth.uid())
  );

drop policy if exists "notes_insert" on notes;
create policy "notes_insert" on notes for insert
  with check (owner_id = auth.uid());

drop policy if exists "notes_update" on notes;
create policy "notes_update" on notes for update
  using (
    owner_id = auth.uid()
    or user_has_note_editor_share(id, auth.uid())
  );

drop policy if exists "notes_delete" on notes;
create policy "notes_delete" on notes for delete
  using (owner_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — note history
-- ────────────────────────────────────────────
create table if not exists note_history (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid references notes(id) on delete cascade,
  changed_by uuid references profiles(id),
  snapshot   text not null,
  changed_at timestamptz default now()
);
alter table note_history enable row level security;
drop policy if exists "nhist_select" on note_history;
create policy "nhist_select" on note_history for select
  using (user_owns_note(note_id, auth.uid()));
drop policy if exists "nhist_insert" on note_history;
create policy "nhist_insert" on note_history for insert
  with check (is_approved());

-- ────────────────────────────────────────────
--  v3.3 — activity log
-- ────────────────────────────────────────────
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  detail      jsonb,
  created_at  timestamptz default now()
);
alter table activity_log enable row level security;
drop policy if exists "actlog_select" on activity_log;
create policy "actlog_select" on activity_log for select
  using (
    (entity_type = 'client' and is_admin())
    or (entity_type = 'note' and user_owns_note(entity_id::uuid, auth.uid()))
  );
drop policy if exists "actlog_insert" on activity_log;
create policy "actlog_insert" on activity_log for insert
  with check (is_approved());

-- ────────────────────────────────────────────
--  v3.3 — note_id column on messages
-- ────────────────────────────────────────────
alter table messages
  add column if not exists note_id uuid references notes(id) on delete set null;

-- ────────────────────────────────────────────
--  STORAGE BUCKET
-- ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('lexdesk-files', 'lexdesk-files', false)
  on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
create policy "storage_select" on storage.objects for select
  using (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');
drop policy if exists "storage_insert" on storage.objects;
create policy "storage_insert" on storage.objects for insert
  with check (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');
drop policy if exists "storage_delete" on storage.objects;
create policy "storage_delete" on storage.objects for delete
  using (bucket_id = 'lexdesk-files' and auth.role() = 'authenticated');

-- ────────────────────────────────────────────
--  SANITY CHECKS
-- ────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','categories','form_schemas','clients','documents',
    'templates','tasks','task_comments','messages','signup_codes',
    'payments','planner_notes','onedrive_tokens','message_reads',
    'notes','note_shares','note_history','activity_log'
  )
order by table_name;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'tasks_status_check';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_admin','is_approved',
    'user_has_note_share','user_has_note_editor_share','user_owns_note'
  );

-- ────────────────────────────────────────────
--  v3.4 additions
-- ────────────────────────────────────────────
-- DOB field in profiles
alter table profiles add column if not exists dob date;
