-- ════════════════════════════════════════════════════════
--  LexDesk — RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
--  Safe to run more than once. Covers every version so far.
--  Supabase → SQL Editor → New Query → paste → Run
-- ════════════════════════════════════════════════════════

-- ── v3.1 fixes (chat visibility, task in_review, message edit/delete) ──
drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_select_approved_or_self" on profiles;
create policy "profiles_select_approved_or_self" on profiles for select
  using (id = auth.uid() or is_admin() or (approved = true and is_approved()));

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open','in_progress','in_review','done','cancelled'));

alter table messages add column if not exists edited_at  timestamptz;
alter table messages add column if not exists deleted    boolean default false;
drop policy if exists "messages_update" on messages;
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));

-- ── v3.2 additions (payments, planner, onedrive tokens, contact linking) ──
alter table clients add column if not exists contact_id text references clients(client_id);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  client_id    text references clients(client_id) on delete cascade,
  amount       numeric not null check (amount > 0),
  payment_date date    not null default current_date,
  method       text,
  note         text,
  recorded_by  uuid references profiles(id),
  created_at   timestamptz default now()
);
alter table payments enable row level security;
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (is_admin() or exists(select 1 from clients c where c.client_id=payments.client_id and c.assigned_to=auth.uid()));
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (is_admin() or exists(select 1 from clients c where c.client_id=payments.client_id and c.assigned_to=auth.uid()));
drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update using (is_admin() or recorded_by=auth.uid());
drop policy if exists "payments_delete" on payments;
create policy "payments_delete" on payments for delete using (is_admin() or recorded_by=auth.uid());

create table if not exists planner_notes (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid references profiles(id) not null,
  note_date date not null default current_date,
  time      text,
  content   text not null,
  done      boolean default false,
  created_at timestamptz default now()
);
alter table planner_notes enable row level security;
drop policy if exists "planner_select" on planner_notes;
create policy "planner_select"  on planner_notes for select using (owner_id=auth.uid());
drop policy if exists "planner_insert" on planner_notes;
create policy "planner_insert"  on planner_notes for insert with check (owner_id=auth.uid());
drop policy if exists "planner_update" on planner_notes;
create policy "planner_update"  on planner_notes for update using (owner_id=auth.uid());
drop policy if exists "planner_delete" on planner_notes;
create policy "planner_delete"  on planner_notes for delete using (owner_id=auth.uid());

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
  using (user_id=auth.uid()) with check (user_id=auth.uid());

-- ── v3.3 additions (notes, note shares, activity log, message reads) ──

-- message_reads: per-user read-receipts so we can compute unread counts
create table if not exists message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  read_at    timestamptz default now(),
  primary key (message_id, user_id)
);
alter table message_reads enable row level security;
drop policy if exists "mreads_select" on message_reads;
create policy "mreads_select" on message_reads for select using (user_id=auth.uid());
drop policy if exists "mreads_insert" on message_reads;
create policy "mreads_insert" on message_reads for insert with check (user_id=auth.uid());
drop policy if exists "mreads_delete" on message_reads;
create policy "mreads_delete" on message_reads for delete using (user_id=auth.uid());

-- notes: private rich-text documents owned by one user
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id) not null,
  title      text not null,
  content    text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;
drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes for select
  using (owner_id=auth.uid() or exists(
    select 1 from note_shares ns where ns.note_id=notes.id and ns.shared_with=auth.uid()
  ));
drop policy if exists "notes_insert" on notes;
create policy "notes_insert" on notes for insert with check (owner_id=auth.uid());
drop policy if exists "notes_update" on notes;
create policy "notes_update" on notes for update
  using (owner_id=auth.uid() or exists(
    select 1 from note_shares ns where ns.note_id=notes.id and ns.shared_with=auth.uid() and ns.permission='editor'
  ));
drop policy if exists "notes_delete" on notes;
create policy "notes_delete" on notes for delete using (owner_id=auth.uid());

-- note_shares: per-user viewer/editor grants, revocable by the owner
create table if not exists note_shares (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid references notes(id) on delete cascade,
  shared_with uuid references profiles(id) on delete cascade,
  permission  text not null check (permission in ('viewer','editor')),
  shared_by   uuid references profiles(id),
  shared_at   timestamptz default now(),
  unique (note_id, shared_with)
);
alter table note_shares enable row level security;
-- Owner can manage all shares for their notes; recipient can read their own share
drop policy if exists "nshares_select" on note_shares;
create policy "nshares_select" on note_shares for select
  using (shared_with=auth.uid() or exists(select 1 from notes n where n.id=note_shares.note_id and n.owner_id=auth.uid()));
drop policy if exists "nshares_insert" on note_shares;
create policy "nshares_insert" on note_shares for insert
  with check (exists(select 1 from notes n where n.id=note_shares.note_id and n.owner_id=auth.uid()));
drop policy if exists "nshares_update" on note_shares;
create policy "nshares_update" on note_shares for update
  using (exists(select 1 from notes n where n.id=note_shares.note_id and n.owner_id=auth.uid()));
drop policy if exists "nshares_delete" on note_shares;
create policy "nshares_delete" on note_shares for delete
  using (exists(select 1 from notes n where n.id=note_shares.note_id and n.owner_id=auth.uid()));

-- note_history: every save of a note records the previous content
create table if not exists note_history (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid references notes(id) on delete cascade,
  changed_by  uuid references profiles(id),
  snapshot    text not null,  -- the content *before* this edit
  changed_at  timestamptz default now()
);
alter table note_history enable row level security;
-- Only the note owner can see the history of their note
drop policy if exists "nhist_select" on note_history;
create policy "nhist_select" on note_history for select
  using (exists(select 1 from notes n where n.id=note_history.note_id and n.owner_id=auth.uid()));
drop policy if exists "nhist_insert" on note_history;
create policy "nhist_insert" on note_history for insert with check (is_approved());

-- activity_log: firm-wide audit trail for client changes + note share events
-- Admin sees client entries; note owner sees their own note entries.
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,      -- e.g. 'client_updated','note_shared','note_edited'
  entity_type text not null,      -- 'client' | 'note'
  entity_id   text not null,      -- client_id or note uuid
  detail      jsonb,
  created_at  timestamptz default now()
);
alter table activity_log enable row level security;
drop policy if exists "actlog_select" on activity_log;
create policy "actlog_select" on activity_log for select
  using (
    (entity_type='client' and is_admin()) or
    (entity_type='note'   and exists(
      select 1 from notes n where n.id::text=activity_log.entity_id and n.owner_id=auth.uid()
    ))
  );
drop policy if exists "actlog_insert" on activity_log;
create policy "actlog_insert" on activity_log for insert with check (is_approved());

-- messages: add note_id column for internal note-link sharing
alter table messages add column if not exists note_id uuid references notes(id) on delete set null;

-- ── Sanity checks ──
select conname, pg_get_constraintdef(oid)
  from pg_constraint where conname='tasks_status_check';
select table_name from information_schema.tables
  where table_name in ('payments','planner_notes','notes','note_shares','note_history','activity_log','message_reads');
select column_name from information_schema.columns
  where table_name='messages' and column_name in ('edited_at','deleted','note_id');
