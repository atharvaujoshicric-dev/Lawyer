use crate::models::{Case, Reminder};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[derive(serde::Deserialize, serde::Serialize, Debug)]
pub struct CreateCasePayload {
    pub client_id: String,
    pub case_type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub court_date: Option<String>,
    pub next_action: Option<String>,
    pub billing_rate: Option<f64>,

    // Cyber fields
    pub incident_date: Option<String>,
    pub breach_type: Option<String>,
    pub affected_systems: Option<String>,
    pub regulatory_deadline: Option<String>,
    pub regulatory_body: Option<String>,
    pub data_compromised: Option<String>,
    pub severity_level: Option<String>,
    pub containment_status: Option<String>,
    pub notification_sent: Option<bool>,
    pub notification_date: Option<String>,

    // Rental fields
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
}

fn next_case_number(db: &rusqlite::Connection) -> Result<String, String> {
    let count: i64 = db
        .query_row("SELECT COUNT(*) FROM cases", [], |row| row.get(0))
        .unwrap_or(0);
    Ok(format!("CASE-{:05}", count + 1))
}

fn row_to_case(row: &rusqlite::Row) -> rusqlite::Result<Case> {
    Ok(Case {
        id: row.get(0)?,
        client_id: row.get(1)?,
        case_number: row.get(2)?,
        case_type: row.get(3)?,
        title: row.get(4)?,
        description: row.get(5)?,
        status: row.get(6)?,
        priority: row.get(7)?,
        opened_date: row.get(8)?,
        closed_date: row.get(9)?,
        court_date: row.get(10)?,
        next_action: row.get(11)?,
        billing_rate: row.get(12)?,
        billed_hours: row.get(13)?,
        incident_date: row.get(14)?,
        breach_type: row.get(15)?,
        affected_systems: row.get(16)?,
        regulatory_deadline: row.get(17)?,
        regulatory_body: row.get(18)?,
        data_compromised: row.get(19)?,
        severity_level: row.get(20)?,
        containment_status: row.get(21)?,
        forensic_report_url: row.get(22)?,
        notification_sent: row.get(23)?,
        notification_date: row.get(24)?,
        property_address: row.get(25)?,
        property_type: row.get(26)?,
        monthly_rent: row.get(27)?,
        security_deposit: row.get(28)?,
        lock_in_period_months: row.get(29)?,
        agreement_start_date: row.get(30)?,
        agreement_expiry_date: row.get(31)?,
        renewal_date: row.get(32)?,
        landlord_name: row.get(33)?,
        landlord_contact: row.get(34)?,
        tenant_name: row.get(35)?,
        tenant_contact: row.get(36)?,
        rent_escalation_pct: row.get(37)?,
        maintenance_terms: row.get(38)?,
        drive_folder_id: row.get(39)?,
        synced: row.get(40)?,
        created_at: row.get(41)?,
        updated_at: row.get(42)?,
    })
}

const CASE_SELECT: &str = "SELECT id, client_id, case_number, case_type, title, description,
    status, priority, opened_date, closed_date, court_date, next_action, billing_rate, billed_hours,
    incident_date, breach_type, affected_systems, regulatory_deadline, regulatory_body,
    data_compromised, severity_level, containment_status, forensic_report_url,
    notification_sent, notification_date,
    property_address, property_type, monthly_rent, security_deposit, lock_in_period_months,
    agreement_start_date, agreement_expiry_date, renewal_date, landlord_name, landlord_contact,
    tenant_name, tenant_contact, rent_escalation_pct, maintenance_terms,
    drive_folder_id, synced, created_at, updated_at FROM cases";

#[tauri::command]
pub async fn create_case(
    payload: CreateCasePayload,
    state: State<'_, AppState>,
) -> Result<Case, String> {
    let id = Uuid::new_v4().to_string();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let case_number = next_case_number(&db)?;

    db.execute(
        "INSERT INTO cases (id, client_id, case_number, case_type, title, description,
         status, priority, court_date, next_action, billing_rate,
         incident_date, breach_type, affected_systems, regulatory_deadline, regulatory_body,
         data_compromised, severity_level, containment_status, notification_sent, notification_date,
         property_address, property_type, monthly_rent, security_deposit, lock_in_period_months,
         agreement_start_date, agreement_expiry_date, renewal_date,
         landlord_name, landlord_contact, tenant_name, tenant_contact,
         rent_escalation_pct, maintenance_terms, synced)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30,?31,?32,?33,?34,?35, 0)",
        params![
            id, payload.client_id, case_number, payload.case_type, payload.title,
            payload.description, payload.status.unwrap_or("open".to_string()),
            payload.priority.unwrap_or("medium".to_string()),
            payload.court_date, payload.next_action, payload.billing_rate.unwrap_or(0.0),
            payload.incident_date, payload.breach_type, payload.affected_systems,
            payload.regulatory_deadline, payload.regulatory_body, payload.data_compromised,
            payload.severity_level, payload.containment_status,
            payload.notification_sent.map(|b| if b { 1 } else { 0 }),
            payload.notification_date,
            payload.property_address, payload.property_type, payload.monthly_rent,
            payload.security_deposit, payload.lock_in_period_months,
            payload.agreement_start_date, payload.agreement_expiry_date, payload.renewal_date,
            payload.landlord_name, payload.landlord_contact,
            payload.tenant_name, payload.tenant_contact,
            payload.rent_escalation_pct, payload.maintenance_terms
        ],
    )
    .map_err(|e| e.to_string())?;

    // Create reminders for deadline-driven cases
    if let Some(ref deadline) = payload.regulatory_deadline {
        let rid = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO reminders (id, case_id, client_id, type, title, due_date)
             VALUES (?1,?2,?3,'REGULATORY_DEADLINE','Regulatory Compliance Deadline',?4)",
            params![rid, id, payload.client_id, deadline],
        ).ok();
    }
    if let Some(ref expiry) = payload.agreement_expiry_date {
        let rid = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO reminders (id, case_id, client_id, type, title, due_date)
             VALUES (?1,?2,?3,'AGREEMENT_EXPIRY','Rental Agreement Expiry',?4)",
            params![rid, id, payload.client_id, expiry],
        ).ok();
    }

    db.execute(
        "INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('CREATE', 'CASE', ?1, ?2)",
        params![id, format!("Created {} case: {}", payload.case_type, payload.title)],
    ).ok();

    db.execute(
        "INSERT INTO sync_queue (operation, entity_type, entity_id) VALUES ('CREATE', 'CASE', ?1)",
        params![id],
    ).ok();

    db.query_row(
        &format!("{} WHERE id = ?1", CASE_SELECT),
        params![id],
        row_to_case,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cases_by_client(
    client_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Case>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(&format!(
            "{} WHERE client_id = ?1 ORDER BY created_at DESC",
            CASE_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let cases = stmt
        .query_map(params![client_id], row_to_case)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(cases)
}

#[tauri::command]
pub async fn get_case_by_id(
    id: String,
    state: State<'_, AppState>,
) -> Result<Case, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.query_row(
        &format!("{} WHERE id = ?1", CASE_SELECT),
        params![id],
        row_to_case,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_case(
    id: String,
    payload: CreateCasePayload,
    state: State<'_, AppState>,
) -> Result<Case, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE cases SET case_type=?1, title=?2, description=?3, status=?4, priority=?5,
         court_date=?6, next_action=?7, billing_rate=?8,
         incident_date=?9, breach_type=?10, affected_systems=?11, regulatory_deadline=?12,
         regulatory_body=?13, data_compromised=?14, severity_level=?15,
         containment_status=?16, notification_sent=?17, notification_date=?18,
         property_address=?19, property_type=?20, monthly_rent=?21, security_deposit=?22,
         lock_in_period_months=?23, agreement_start_date=?24, agreement_expiry_date=?25,
         renewal_date=?26, landlord_name=?27, landlord_contact=?28, tenant_name=?29,
         tenant_contact=?30, rent_escalation_pct=?31, maintenance_terms=?32,
         synced=0, updated_at=datetime('now') WHERE id=?33",
        params![
            payload.case_type, payload.title, payload.description,
            payload.status.unwrap_or("open".to_string()),
            payload.priority.unwrap_or("medium".to_string()),
            payload.court_date, payload.next_action, payload.billing_rate.unwrap_or(0.0),
            payload.incident_date, payload.breach_type, payload.affected_systems,
            payload.regulatory_deadline, payload.regulatory_body, payload.data_compromised,
            payload.severity_level, payload.containment_status,
            payload.notification_sent.map(|b| if b { 1 } else { 0 }),
            payload.notification_date,
            payload.property_address, payload.property_type, payload.monthly_rent,
            payload.security_deposit, payload.lock_in_period_months,
            payload.agreement_start_date, payload.agreement_expiry_date, payload.renewal_date,
            payload.landlord_name, payload.landlord_contact, payload.tenant_name,
            payload.tenant_contact, payload.rent_escalation_pct, payload.maintenance_terms, id
        ],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO sync_queue (operation, entity_type, entity_id) VALUES ('UPDATE', 'CASE', ?1)",
        params![id],
    ).ok();

    db.query_row(
        &format!("{} WHERE id = ?1", CASE_SELECT),
        params![id],
        row_to_case,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_case(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM cases WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('DELETE', 'CASE', ?1, 'Case deleted')",
        params![id],
    ).ok();
    Ok(())
}

#[tauri::command]
pub async fn get_expiring_soon(
    days: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<Reminder>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let threshold = days.unwrap_or(60);

    let mut stmt = db.prepare(
        "SELECT r.id, r.case_id, r.client_id, r.type, r.title, r.due_date,
         CAST(julianday(r.due_date) - julianday('now') AS INTEGER) as days_remaining,
         c.full_name, ca.title
         FROM reminders r
         LEFT JOIN clients c ON r.client_id = c.id
         LEFT JOIN cases ca ON r.case_id = ca.id
         WHERE r.dismissed = 0
         AND julianday(r.due_date) >= julianday('now')
         AND julianday(r.due_date) <= julianday('now') + ?1
         ORDER BY r.due_date ASC",
    ).map_err(|e| e.to_string())?;

    let reminders = stmt
        .query_map(params![threshold], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                case_id: row.get(1)?,
                client_id: row.get(2)?,
                reminder_type: row.get(3)?,
                title: row.get(4)?,
                due_date: row.get(5)?,
                days_remaining: row.get(6)?,
                client_name: row.get(7)?,
                case_title: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(reminders)
}
