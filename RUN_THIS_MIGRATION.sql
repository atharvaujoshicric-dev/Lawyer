-- ════════════════════════════════════════════════════════
--  LexDesk — FULL MIGRATION (all versions)
--  Safe to run more than once on any existing install.
--  Supabase → SQL Editor → New Query → paste → Run
-- ════════════════════════════════════════════════════════

-- ────────────────────────────────────────────
--  HELPER FUNCTIONS (idempotent)
-- ────────────────────────────────────────────
create or replace function is_admin() returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin' and approved = true);
$$ language sql security definer stable;

create or replace function is_approved() returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and approved = true);
$$ language sql security definer stable;

-- ────────────────────────────────────────────
--  v3.1 — profiles visibility fix
-- ────────────────────────────────────────────
drop policy if exists "profiles_select_own_or_admin"      on profiles;
drop policy if exists "profiles_select_approved_or_self"  on profiles;
create policy "profiles_select_approved_or_self" on profiles for select
  using (id = auth.uid() or is_admin() or (approved = true and is_approved()));

-- ────────────────────────────────────────────
--  v3.1 — task in_review status
-- ────────────────────────────────────────────
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open','in_progress','in_review','done','cancelled'));

-- ────────────────────────────────────────────
--  v3.1 — message edit/delete columns
-- ────────────────────────────────────────────
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted   boolean default false;
drop policy if exists "messages_update" on messages;
create policy "messages_update" on messages for update
  using (sender_id = auth.uid() and created_at > (now() - interval '5 minutes'));

-- ────────────────────────────────────────────
--  v3.2 — multi-case client linking
-- ────────────────────────────────────────────
alter table clients add column if not exists contact_id text references clients(client_id);

-- ────────────────────────────────────────────
--  v3.2 — payments table
-- ────────────────────────────────────────────
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

-- ────────────────────────────────────────────
--  v3.2 — daily planner notes
-- ────────────────────────────────────────────
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

-- ────────────────────────────────────────────
--  v3.2 — OneDrive token storage
-- ────────────────────────────────────────────
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
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────
--  v3.3 — message read receipts
--  (must exist before notes policies reference it)
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
--  v3.3 — note_shares table
--  (must be created BEFORE notes, because notes policies
--   reference note_shares in their USING expressions)
-- ────────────────────────────────────────────
create table if not exists note_shares (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid,                          -- FK added after notes table exists (below)
  shared_with uuid references profiles(id) on delete cascade,
  permission  text not null check (permission in ('viewer','editor')),
  shared_by   uuid references profiles(id),
  shared_at   timestamptz default now(),
  unique (note_id, shared_with)
);
alter table note_shares enable row level security;

-- ────────────────────────────────────────────
--  v3.3 — notes table (depends on note_shares existing)
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

-- Now add the FK from note_shares → notes (safe to run repeatedly)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'note_shares_note_id_fkey'
  ) then
    alter table note_shares
      add constraint note_shares_note_id_fkey
      foreign key (note_id) references notes(id) on delete cascade;
  end if;
end $$;

-- notes RLS (now note_shares exists so the policy compiles)
drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes for select
  using (
    owner_id = auth.uid() or
    exists(select 1 from note_shares ns
           where ns.note_id = notes.id and ns.shared_with = auth.uid())
  );
drop policy if exists "notes_insert" on notes;
create policy "notes_insert" on notes for insert with check (owner_id = auth.uid());
drop policy if exists "notes_update" on notes;
create policy "notes_update" on notes for update
  using (
    owner_id = auth.uid() or
    exists(select 1 from note_shares ns
           where ns.note_id = notes.id and ns.shared_with = auth.uid()
             and ns.permission = 'editor')
  );
drop policy if exists "notes_delete" on notes;
create policy "notes_delete" on notes for delete using (owner_id = auth.uid());

-- note_shares RLS (now notes table exists)
drop policy if exists "nshares_select" on note_shares;
create policy "nshares_select" on note_shares for select
  using (
    shared_with = auth.uid() or
    exists(select 1 from notes n where n.id = note_shares.note_id and n.owner_id = auth.uid())
  );
drop policy if exists "nshares_insert" on note_shares;
create policy "nshares_insert" on note_shares for insert
  with check (
    exists(select 1 from notes n where n.id = note_shares.note_id and n.owner_id = auth.uid())
  );
drop policy if exists "nshares_update" on note_shares;
create policy "nshares_update" on note_shares for update
  using (
    exists(select 1 from notes n where n.id = note_shares.note_id and n.owner_id = auth.uid())
  );
drop policy if exists "nshares_delete" on note_shares;
create policy "nshares_delete" on note_shares for delete
  using (
    exists(select 1 from notes n where n.id = note_shares.note_id and n.owner_id = auth.uid())
  );

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
  using (
    exists(select 1 from notes n where n.id = note_history.note_id and n.owner_id = auth.uid())
  );
drop policy if exists "nhist_insert" on note_history;
create policy "nhist_insert" on note_history for insert with check (is_approved());

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
    (entity_type = 'client' and is_admin()) or
    (entity_type = 'note' and exists(
      select 1 from notes n where n.id::text = activity_log.entity_id and n.owner_id = auth.uid()
    ))
  );
drop policy if exists "actlog_insert" on activity_log;
create policy "actlog_insert" on activity_log for insert with check (is_approved());

-- ────────────────────────────────────────────
--  v3.3 — note_id column on messages
-- ────────────────────────────────────────────
alter table messages add column if not exists note_id uuid references notes(id) on delete set null;

-- ────────────────────────────────────────────
--  STORAGE BUCKET (safe no-op if already exists)
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
--  SANITY CHECKS — confirm everything was created
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
