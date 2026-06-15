use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Client {
    pub id: String,
    pub client_number: String,
    pub full_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub id_number: Option<String>,
    pub date_of_birth: Option<String>,
    pub occupation: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub folder_path: Option<String>,
    pub drive_folder_id: Option<String>,
    pub synced: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateClientPayload {
    pub full_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub id_number: Option<String>,
    pub date_of_birth: Option<String>,
    pub occupation: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Case {
    pub id: String,
    pub client_id: String,
    pub case_number: String,
    pub case_type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub opened_date: String,
    pub closed_date: Option<String>,
    pub court_date: Option<String>,
    pub next_action: Option<String>,
    pub billing_rate: f64,
    pub billed_hours: f64,

    // Cybersecurity
    pub incident_date: Option<String>,
    pub breach_type: Option<String>,
    pub affected_systems: Option<String>,
    pub regulatory_deadline: Option<String>,
    pub regulatory_body: Option<String>,
    pub data_compromised: Option<String>,
    pub severity_level: Option<String>,
    pub containment_status: Option<String>,
    pub forensic_report_url: Option<String>,
    pub notification_sent: Option<i32>,
    pub notification_date: Option<String>,

    // Rental
    pub property_address: Option<String>,
    pub property_type: Option<String>,
    pub monthly_rent: Option<f64>,
    pub security_deposit: Option<f64>,
    pub lock_in_period_months: Option<i32>,
    pub agreement_start_date: Option<String>,
    pub agreement_expiry_date: Option<String>,
    pub renewal_date: Option<String>,
    pub landlord_name: Option<String>,
    pub landlord_contact: Option<String>,
    pub tenant_name: Option<String>,
    pub tenant_contact: Option<String>,
    pub rent_escalation_pct: Option<f64>,
    pub maintenance_terms: Option<String>,

    pub drive_folder_id: Option<String>,
    pub synced: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_clients: i64,
    pub active_clients: i64,
    pub total_cases: i64,
    pub open_cases: i64,
    pub cyber_cases: i64,
    pub rental_cases: i64,
    pub expiring_soon: i64,
    pub unsynced_items: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityEntry {
    pub id: i64,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub details: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatus {
    pub is_authenticated: bool,
    pub last_sync: Option<String>,
    pub unsynced_count: i64,
    pub drive_folder_url: Option<String>,
    pub sync_in_progress: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub case_id: String,
    pub client_id: String,
    pub reminder_type: String,
    pub title: String,
    pub due_date: String,
    pub days_remaining: i64,
    pub client_name: Option<String>,
    pub case_title: Option<String>,
}
