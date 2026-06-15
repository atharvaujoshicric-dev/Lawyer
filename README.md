# LexTrack — Legal Practice Manager

A professional, **offline-first** desktop application for Cybersecurity and General Practice lawyers.  
Built with **Tauri + React + SQLite** with optional **Google Drive** sync.

---

## Features

| Feature | Details |
|---|---|
| 🔐 Master Password | SHA-256 protected local authentication |
| 👥 Client Management | Full CRUD with folder auto-creation |
| ⚖️ Case Tracking | Dynamic forms for Cyber, Rental, and General matters |
| 📁 Google Drive Sync | OAuth2 background sync with offline queue |
| 🔔 Smart Reminders | 60 / 30 / 7-day deadline alerts via OS notifications |
| 📊 Dashboard | Live stats, upcoming deadlines, recent activity |
| 🗂️ File Explorer | Open local client folders directly from the app |

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Rust | 1.70+ | https://rustup.rs |
| Tauri CLI | 1.x | `npm install -g @tauri-apps/cli` |
| VS Build Tools | Latest | Required on Windows for Rust compilation |

### Install Rust on Windows
```powershell
# Download and run rustup-init.exe from https://rustup.rs
# Then add the MSVC target:
rustup target add x86_64-pc-windows-msvc
```

---

## Quick Start (Development)

```bash
# 1. Clone / extract the project
cd legal-practice-manager

# 2. Install JavaScript dependencies
npm install

# 3. Run in development mode (browser, no Tauri)
npm run dev

# 4. Run as a desktop app (Tauri)
npm run tauri dev
```

> **Browser dev mode** uses localStorage for auth and in-memory data — no Rust/SQLite required. All UI features work without Tauri.

---

## Building the Installer (.msi / .exe)

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/msi/LegalPracticeManager_*.msi`

---

## Google Drive Integration Setup

Google Drive sync is **optional** — the app works fully offline without it.  
To enable sync, follow these steps:

### Step 1 — Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click **New Project** → name it `LexTrack` → **Create**
3. In the left menu go to **APIs & Services → Library**
4. Search for **Google Drive API** → click it → **Enable**

### Step 2 — Configure OAuth2 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client IDs**
3. If prompted, configure the OAuth consent screen first:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: `LexTrack`
   - Add your email as a test user
4. Back to Credentials → **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `LexTrack Desktop`
   - Authorized redirect URIs: `http://localhost:8976/oauth/callback`
5. Click **Create** → copy the **Client ID** and **Client Secret**

### Step 3 — Add Credentials to the App

In the app, go to **Settings → Google Drive** and enter:
- **Client ID** (from step 2)
- **Client Secret** (from step 2)

Then click **Connect Google Drive** and follow the browser authentication flow.

### Step 4 — Verify

After connecting, the app will:
- Create a `LegalPracticeManager/` folder in your Google Drive
- Display a direct link to the folder
- Begin background sync every 5 minutes

---

## Database Location

```
Windows: C:\Users\<YourName>\AppData\Roaming\LegalPracticeManager\master_tracker.db
```

The database uses WAL mode for reliability and is local-only (not pushed to Drive).  
Structured data is replicated as `client_profile.json` files inside each client folder on Drive.

---

## Folder Structure (Local + Drive Mirror)

```
LegalPracticeManager/              ← Google Drive root (also in AppData locally)
└── Clients/
    └── CL-1024_John_Doe/
        ├── client_profile.json    ← Client metadata + case index
        ├── Cyber_Security/        ← Cybersecurity case documents
        ├── Rental_Agreements/     ← Lease/property documents
        ├── General/               ← General legal matter documents
        └── Correspondence/        ← Emails, notices, letters
```

---

## Case Types & Fields

### Cybersecurity
- Incident Date, Breach Type, Severity (Low / Medium / High / Critical)
- Affected Systems, Data Compromised, Containment Status
- Regulatory Body (CERT-In, SEBI, RBI, etc.), Regulatory Deadline
- Notification Sent flag

### Rental / Property
- Property Type & Address, Monthly Rent (₹), Security Deposit
- Lock-in Period, Agreement Start / Expiry / Renewal dates
- Annual Escalation %, Maintenance Terms
- Landlord & Tenant name / contact

### General
- Court / Forum, Case Number / FIR No.
- Opposing Party, Next Hearing Date
- Matter Description

---

## Deadline Notifications

The background service checks for upcoming deadlines every hour and sends Windows notifications:

| Alert | Trigger |
|---|---|
| 🟡 60-day warning | Rental expiry / regulatory deadline in 60 days |
| 🟠 30-day warning | 30 days remaining |
| 🔴 7-day critical | 7 days remaining |
| ❌ Overdue | Date has passed |

---

## Offline Sync Queue

All operations work without internet. Changes are written locally with `synced = 0`.  
When connectivity is restored, the background worker automatically:
1. Uploads new client folders and `client_profile.json` to Drive
2. Pushes any updated files
3. Flips `synced = 1` in the database

---

## Project Structure

```
legal-practice-manager/
├── src/                          # React frontend
│   ├── components/
│   │   ├── Cases/                # CaseCard, CreateCaseModal, CaseDetail
│   │   ├── Clients/              # ClientList, ClientDetail
│   │   ├── Dashboard/            # Dashboard
│   │   ├── Settings/             # SetupScreen, LoginScreen, SettingsPage
│   │   └── Shared/               # Layout, Modal, Toast, PageHeader
│   ├── services/tauri.ts         # Tauri IPC bridge + browser mocks
│   ├── store/index.ts            # Zustand state management
│   ├── types/index.ts            # TypeScript interfaces
│   └── styles/globals.css        # Dark gold theme
│
└── src-tauri/                    # Rust / Tauri backend
    ├── src/
    │   ├── commands/             # auth, clients, cases, dashboard, drive, files
    │   ├── db.rs                 # SQLite schema + initialization
    │   ├── models.rs             # Rust data structs
    │   ├── drive.rs              # Google Drive API helpers
    │   ├── sync.rs               # Background sync + reminder engine
    │   └── main.rs               # AppState, command registry, startup
    ├── Cargo.toml
    └── tauri.conf.json
```

---

## Troubleshooting

**App won't start / blank screen**
- Run `npm install` again
- Try `npm run dev` (browser mode) to rule out Tauri issues

**Rust compilation fails on Windows**
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++"
- Run `rustup update`

**Google Drive auth fails**
- Confirm redirect URI is exactly `http://localhost:8976/oauth/callback` in Google Console
- Ensure you added your email as a test user in the OAuth consent screen
- Check that Google Drive API is enabled in the project

**Notifications not appearing**
- Windows: check notification settings → allow notifications from LegalPracticeManager
- The app must be running (or in the system tray) to send notifications

---

## License

Private use only. Not for redistribution.
