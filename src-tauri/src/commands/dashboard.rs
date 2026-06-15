use crate::models::{ActivityEntry, DashboardStats};
use crate::AppState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub async fn get_dashboard_stats(
    state: State<'_, AppState>,
) -> Result<DashboardStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total_clients: i64 = db
        .query_row("SELECT COUNT(*) FROM clients", [], |r| r.get(0))
        .unwrap_or(0);
    let active_clients: i64 = db
        .query_row("SELECT COUNT(*) FROM clients WHERE status='active'", [], |r| r.get(0))
        .unwrap_or(0);
    let total_cases: i64 = db
        .query_row("SELECT COUNT(*) FROM cases", [], |r| r.get(0))
        .unwrap_or(0);
    let open_cases: i64 = db
        .query_row("SELECT COUNT(*) FROM cases WHERE status='open'", [], |r| r.get(0))
        .unwrap_or(0);
    let cyber_cases: i64 = db
        .query_row("SELECT COUNT(*) FROM cases WHERE case_type='cybersecurity'", [], |r| r.get(0))
        .unwrap_or(0);
    let rental_cases: i64 = db
        .query_row("SELECT COUNT(*) FROM cases WHERE case_type='rental'", [], |r| r.get(0))
        .unwrap_or(0);
    let expiring_soon: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM reminders WHERE dismissed=0 AND julianday(due_date) BETWEEN julianday('now') AND julianday('now')+60",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let unsynced_clients: i64 = db
        .query_row("SELECT COUNT(*) FROM clients WHERE synced=0", [], |r| r.get(0))
        .unwrap_or(0);
    let unsynced_cases: i64 = db
        .query_row("SELECT COUNT(*) FROM cases WHERE synced=0", [], |r| r.get(0))
        .unwrap_or(0);

    Ok(DashboardStats {
        total_clients,
        active_clients,
        total_cases,
        open_cases,
        cyber_cases,
        rental_cases,
        expiring_soon,
        unsynced_items: unsynced_clients + unsynced_cases,
    })
}

#[tauri::command]
pub async fn get_recent_activity(
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<ActivityEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let n = limit.unwrap_or(20);
    let mut stmt = db
        .prepare(
            "SELECT id, action, entity_type, entity_id, details, created_at
             FROM activity_log ORDER BY id DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map(params![n], |row| {
            Ok(ActivityEntry {
                id: row.get(0)?,
                action: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                details: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(entries)
}
