# LexDesk — Legal Practice Management CRM

A fully offline-capable, single-file Legal Practice Management & Client Tracker built for cybersecurity and general practice lawyers.

## Features

- **Encrypted local storage** — All client data saved in browser localStorage (AES-256 reference architecture for desktop build)
- **Three case types** — Cybersecurity, Rental/Property, and General Practice with dynamic form fields
- **Google Drive sync** — Offline-first queue with background sync simulation
- **Deadline tracking** — Automatic 60-day alert system for agreement expiry and regulatory deadlines
- **Document management** — Attach PDFs, DOCX, XLSX, and images to client records
- **Responsive design** — Fully adaptive for desktop, tablet, and mobile
- **Zero dependencies** — Single `index.html` file, no build step required

## Case-Specific Fields

### Cybersecurity Cases
- Incident Date & Breach Type (Ransomware, Data Exfiltration, Phishing, etc.)
- Affected Systems / Servers
- Records Compromised
- Regulatory Body (CERT-In, GDPR, HIPAA, PDPB, RBI, SEBI)
- Regulatory Compliance Deadline
- Forensic Report Status
- Case Priority

### Rental / Property Cases
- Property Address & Type
- Monthly Rent & Security Deposit
- Lock-in Period
- Agreement Start, Expiry & Renewal Date
- Landlord Details
- Dispute Notes

### General Practice
- Matter Description & Practice Area
- Court / Tribunal & Case Number
- Opposite Party
- Next Hearing Date
- Judge / Bench
- Stage of Proceedings

## Deployment on GitHub Pages

1. Fork or clone this repository
2. Go to **Settings → Pages**
3. Set source to **main branch → / (root)**
4. Your app will be live at `https://yourusername.github.io/repo-name/`

## First-Time Setup

1. Enter your name and bar registration number
2. Create a Master Password (min. 8 characters)
3. Optionally link your Google Drive folder URL
4. Start adding clients!

## Data Privacy

All data is stored in your browser's `localStorage` — nothing is sent to any server. The Google Drive URL is only stored as a reference for the manual sync workflow.

## Architecture Notes

This is a **GitHub Pages demo** version. The full desktop application uses:
- **Tauri + React** for `.msi`/`.exe` packaging
- **SQLite + SQLCipher** for AES-256 encrypted local database
- **Google Drive API v3** for OAuth2-authenticated background sync
- **Background service workers** for the offline sync queue

## License

Private / Internal use. Designed for professional legal practice management.
