use anyhow::Result;
use rusqlite::{Connection, params};
use std::path::Path;

pub fn initialize_database(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    create_schema(&conn)?;
    Ok(conn)
}

fn create_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        -- App configuration and auth
        CREATE TABLE IF NOT EXISTS app_config (
            key     TEXT PRIMARY KEY,
            value   TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Activity log for audit trail
        CREATE TABLE IF NOT EXISTS activity_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            action      TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id   TEXT,
            details     TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        -- Clients master table
        CREATE TABLE IF NOT EXISTS clients (
            id              TEXT PRIMARY KEY,
            client_number   TEXT UNIQUE NOT NULL,
            full_name       TEXT NOT NULL,
            email           TEXT,
            phone           TEXT,
            address         TEXT,
            id_number       TEXT,
            date_of_birth   TEXT,
            occupation      TEXT,
            notes           TEXT,
            status          TEXT DEFAULT 'active',
            folder_path     TEXT,
            drive_folder_id TEXT,
            synced          INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now'))
        );

        -- Cases table (linked to clients)
        CREATE TABLE IF NOT EXISTS cases (
            id              TEXT PRIMARY KEY,
            client_id       TEXT NOT NULL,
            case_number     TEXT UNIQUE NOT NULL,
            case_type       TEXT NOT NULL,
            title           TEXT NOT NULL,
            description     TEXT,
            status          TEXT DEFAULT 'open',
            priority        TEXT DEFAULT 'medium',
            opened_date     TEXT DEFAULT (date('now')),
            closed_date     TEXT,
            court_date      TEXT,
            next_action     TEXT,
            billing_rate    REAL DEFAULT 0,
            billed_hours    REAL DEFAULT 0,

            -- Cybersecurity specific fields
            incident_date       TEXT,
            breach_type         TEXT,
            affected_systems    TEXT,
            regulatory_deadline TEXT,
            regulatory_body     TEXT,
            data_compromised    TEXT,
            severity_level      TEXT,
            containment_status  TEXT,
            forensic_report_url TEXT,
            notification_sent   INTEGER DEFAULT 0,
            notification_date   TEXT,

            -- Rental/Property specific fields
            property_address    TEXT,
            property_type       TEXT,
            monthly_rent        REAL,
            security_deposit    REAL,
            lock_in_period_months INTEGER,
            agreement_start_date  TEXT,
            agreement_expiry_date TEXT,
            renewal_date          TEXT,
            landlord_name         TEXT,
            landlord_contact      TEXT,
            tenant_name           TEXT,
            tenant_contact        TEXT,
            rent_escalation_pct   REAL,
            maintenance_terms     TEXT,

            drive_folder_id TEXT,
            synced          INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now')),

            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        );

        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
            id          TEXT PRIMARY KEY,
            client_id   TEXT NOT NULL,
            case_id     TEXT,
            file_name   TEXT NOT NULL,
            file_path   TEXT NOT NULL,
            file_size   INTEGER,
            mime_type   TEXT,
            drive_file_id TEXT,
            synced      INTEGER DEFAULT 0,
            uploaded_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
        );

        -- Sync queue for offline changes
        CREATE TABLE IF NOT EXISTS sync_queue (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            operation   TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id   TEXT NOT NULL,
            payload     TEXT,
            attempts    INTEGER DEFAULT 0,
            last_error  TEXT,
            created_at  TEXT DEFAULT (datetime('now')),
            processed_at TEXT
        );

        -- Reminders and deadlines
        CREATE TABLE IF NOT EXISTS reminders (
            id          TEXT PRIMARY KEY,
            case_id     TEXT NOT NULL,
            client_id   TEXT NOT NULL,
            type        TEXT NOT NULL,
            title       TEXT NOT NULL,
            due_date    TEXT NOT NULL,
            notified_60 INTEGER DEFAULT 0,
            notified_30 INTEGER DEFAULT 0,
            notified_7  INTEGER DEFAULT 0,
            dismissed   INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_clients_number ON clients(client_number);
        CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
        CREATE INDEX IF NOT EXISTS idx_clients_synced ON clients(synced);
        CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id);
        CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(case_type);
        CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
        CREATE INDEX IF NOT EXISTS idx_cases_synced ON cases(synced);
        CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_processed ON sync_queue(processed_at);
    ")?;

    Ok(())
}
