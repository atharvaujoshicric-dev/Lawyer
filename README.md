# LexDesk — Legal Practice Management CRM

A complete, multi-user legal practice management system for a Cybersecurity + General Practice law firm. Built as a single-page app, backed by Supabase (Postgres + Auth + Storage), deployable to GitHub Pages.

## v3.1 update — bug fixes and new features

If you already set up LexDesk and ran the original `supabase_schema.sql`, you don't need to start over. Just run the **migration block** at the bottom of the new `supabase_schema.sql` (everything after the `MIGRATION` header) in your Supabase SQL Editor — it's safe to run even if some of it doesn't apply yet.

**Bugs fixed:**
- Assistants couldn't see each other (or the Admin) in Direct Messages — caused by a database security rule that only let people see their own profile. Fixed so any approved team member can see the whole team.
- A security gap let a message **recipient** edit or delete a message that wasn't theirs. Now only the original sender can edit/delete their own message, and only within 5 minutes — enforced at the database level, not just in the interface.
- Deleting a client left their uploaded files sitting in storage forever, slowly eating space. Files are now removed when the client is deleted.
- Documents had no delete option even though the permissions already supported it. Added.
- Regenerating the team signup code had a small window where, if something went wrong, you could be left with no working code at all. Fixed the order of operations.
- Two people creating a client at the exact same moment could get assigned the same Client ID, causing the second save to silently fail. The app now detects this and retries automatically.

**New features:**
- **Chat**: edit or delete your own messages within 5 minutes of sending. Edited messages show "(Edited)" next to the timestamp; deleted messages show "This message was deleted." The edit/delete options disappear automatically once the 5 minutes pass.
- **Tasks**: a full review workflow. An Assistant can send a task for review once they're done; the Senior Advocate then sends it back for rework, reopens it, or approves and closes it. The task board now has a fifth column, "In Review."

## v3 — original feature set

## What's included

- Multi-user accounts with Supabase Auth (email + password)
- Role-based access: **Admin** (full "god mode" — can delete clients, manage users, edit forms) vs **Assistant Lawyer** (sees only assigned clients, cannot delete)
- Self-signup flow: first person to sign up becomes Admin automatically; everyone else signs up with a code the Admin shares, then waits for approval
- Dynamic case categories and custom form fields — add new case types beyond Cyber/Rental/General, edit/reorder/require fields per category
- Real file upload + inline preview (images, PDFs, text files) via Supabase Storage
- Draft/template documents with placeholder fill-in ({{CLIENT_NAME}}, {{DATE}}, etc.), shared across the whole team
- Internal team chat with file attachments (polls every 15 seconds — no websocket complexity)
- Task assignment respecting hierarchy: Assistants can only raise tasks to the Admin; Admin can assign to anyone
- Deadline tracking and dashboard alerts
- Excel export (one workbook, 4 tabs: Clients / Documents / Users / Tasks)
- Mobile-first responsive design throughout, including a rebuilt Settings page
- OneDrive sync: UI is stubbed and ready, but **not yet wired up** — see "Adding OneDrive later" below

## One-time setup

### 1. Run the database schema

1. Go to your Supabase project → **SQL Editor** → **New Query**
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run**

This creates all tables, security policies, the storage bucket, and seeds the three default case categories (Cybersecurity, Rental, General).

### 2. Get your Supabase credentials

In your Supabase project: **Settings → API**. You'll need the **Project URL** and the **anon/public key** (NOT the service_role key).

### 3. Deploy the app

Upload `index.html` (and the included `.nojekyll` file) to a GitHub repository, then enable GitHub Pages in repo settings, or just open `index.html` directly in a browser / host it anywhere static.

### 4. First run

1. Open the app — it will ask for your Supabase URL and anon key (one-time, stored in your browser's localStorage)
2. Go to the **Sign Up** tab and create your account — you will automatically become the Admin
3. From **Users**, copy your signup code and share it with any assistant lawyers
4. When an assistant signs up with that code, approve them from the **Users** page and assign their role

## Adding OneDrive sync later

The Settings page has a OneDrive section ready to go but disabled. When you're ready:
1. Register an app in the [Azure Portal](https://portal.azure.com) (Personal Microsoft Account / OneDrive, not OneDrive for Business)
2. Paste the Client ID into Settings → OneDrive Sync
3. Let me know and I'll wire up the OAuth flow and file-sync logic (same pattern as the previous Google Drive integration)

## Notes

- File uploads are capped at 20MB and stored in Supabase Storage (private bucket, signed URLs for viewing/downloading)
- All data access is enforced server-side via Postgres Row Level Security — the RBAC rules aren't just UI conventions, they're enforced at the database level
- Chat and task lists refresh automatically every 15 seconds while those tabs are open
