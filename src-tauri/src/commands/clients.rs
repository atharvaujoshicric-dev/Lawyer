use crate::models::{Client, CreateClientPayload};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn next_client_number(db: &rusqlite::Connection) -> Result<String, String> {
    let max: Option<String> = db
        .query_row(
            "SELECT client_number FROM clients ORDER BY rowid DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    let next_num = match max {
        Some(s) => {
            let num: u32 = s
                .trim_start_matches("CL-")
                .parse()
                .unwrap_or(1023);
            num + 1
        }
        None => 1024,
    };
    Ok(format!("CL-{:04}", next_num))
}

#[tauri::command]
pub async fn create_client(
    payload: CreateClientPayload,
    state: State<'_, AppState>,
) -> Result<Client, String> {
    let id = Uuid::new_v4().to_string();
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let client_number = next_client_number(&db)?;

    // Create safe folder name: CL-1024_John_Doe
    let safe_name = payload.full_name.replace(' ', "_").replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "");
    let folder_name = format!("{}_{}", client_number, safe_name);
    let folder_path = state
        .app_data_dir
        .join("Clients")
        .join(&folder_name);

    // Create local directories
    std::fs::create_dir_all(folder_path.join("Cyber_Security"))
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(folder_path.join("Rental_Agreements"))
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(folder_path.join("General"))
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(folder_path.join("Correspondence"))
        .map_err(|e| e.to_string())?;

    let folder_path_str = folder_path.to_string_lossy().to_string();

    // Create client_profile.json
    let profile = serde_json::json!({
        "id": id,
        "client_number": client_number,
        "full_name": payload.full_name,
        "email": payload.email,
        "phone": payload.phone,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "history": []
    });
    let profile_path = folder_path.join("client_profile.json");
    std::fs::write(&profile_path, serde_json::to_string_pretty(&profile).unwrap())
        .map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO clients (id, client_number, full_name, email, phone, address,
         id_number, date_of_birth, occupation, notes, folder_path, synced)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11, 0)",
        params![
            id, client_number, payload.full_name, payload.email, payload.phone,
            payload.address, payload.id_number, payload.date_of_birth,
            payload.occupation, payload.notes, folder_path_str
        ],
    )
    .map_err(|e| e.to_string())?;

    // Log activity
    db.execute(
        "INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('CREATE', 'CLIENT', ?1, ?2)",
        params![id, format!("Created client: {}", payload.full_name)],
    ).ok();

    // Queue for sync
    db.execute(
        "INSERT INTO sync_queue (operation, entity_type, entity_id, payload) VALUES ('CREATE', 'CLIENT', ?1, ?2)",
        params![id, format!("{}|{}", client_number, payload.full_name)],
    ).ok();

    get_client_by_id_internal(&db, &id)
}

fn get_client_by_id_internal(db: &rusqlite::Connection, id: &str) -> Result<Client, String> {
    db.query_row(
        "SELECT id, client_number, full_name, email, phone, address, id_number,
         date_of_birth, occupation, notes, status, folder_path, drive_folder_id,
         synced, created_at, updated_at FROM clients WHERE id = ?1",
        params![id],
        |row| {
            Ok(Client {
                id: row.get(0)?,
                client_number: row.get(1)?,
                full_name: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                address: row.get(5)?,
                id_number: row.get(6)?,
                date_of_birth: row.get(7)?,
                occupation: row.get(8)?,
                notes: row.get(9)?,
                status: row.get(10)?,
                folder_path: row.get(11)?,
                drive_folder_id: row.get(12)?,
                synced: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_client_by_id(
    id: String,
    state: State<'_, AppState>,
) -> Result<Client, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    get_client_by_id_internal(&db, &id)
}

#[tauri::command]
pub async fn get_all_clients(state: State<'_, AppState>) -> Result<Vec<Client>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, client_number, full_name, email, phone, address, id_number,
             date_of_birth, occupation, notes, status, folder_path, drive_folder_id,
             synced, created_at, updated_at FROM clients ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let clients = stmt
        .query_map([], |row| {
            Ok(Client {
                id: row.get(0)?,
                client_number: row.get(1)?,
                full_name: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                address: row.get(5)?,
                id_number: row.get(6)?,
                date_of_birth: row.get(7)?,
                occupation: row.get(8)?,
                notes: row.get(9)?,
                status: row.get(10)?,
                folder_path: row.get(11)?,
                drive_folder_id: row.get(12)?,
                synced: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(clients)
}

#[tauri::command]
pub async fn search_clients(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<Client>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let search = format!("%{}%", query);
    let mut stmt = db
        .prepare(
            "SELECT id, client_number, full_name, email, phone, address, id_number,
             date_of_birth, occupation, notes, status, folder_path, drive_folder_id,
             synced, created_at, updated_at FROM clients
             WHERE full_name LIKE ?1 OR client_number LIKE ?1 OR email LIKE ?1
             OR phone LIKE ?1 ORDER BY full_name",
        )
        .map_err(|e| e.to_string())?;

    let clients = stmt
        .query_map(params![search], |row| {
            Ok(Client {
                id: row.get(0)?,
                client_number: row.get(1)?,
                full_name: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                address: row.get(5)?,
                id_number: row.get(6)?,
                date_of_birth: row.get(7)?,
                occupation: row.get(8)?,
                notes: row.get(9)?,
                status: row.get(10)?,
                folder_path: row.get(11)?,
                drive_folder_id: row.get(12)?,
                synced: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(clients)
}

#[tauri::command]
pub async fn update_client(
    id: String,
    payload: CreateClientPayload,
    state: State<'_, AppState>,
) -> Result<Client, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE clients SET full_name=?1, email=?2, phone=?3, address=?4,
         id_number=?5, date_of_birth=?6, occupation=?7, notes=?8,
         synced=0, updated_at=datetime('now') WHERE id=?9",
        params![
            payload.full_name, payload.email, payload.phone, payload.address,
            payload.id_number, payload.date_of_birth, payload.occupation,
            payload.notes, id
        ],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO sync_queue (operation, entity_type, entity_id) VALUES ('UPDATE', 'CLIENT', ?1)",
        params![id],
    ).ok();

    db.execute(
        "INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('UPDATE', 'CLIENT', ?1, ?2)",
        params![id, format!("Updated client: {}", payload.full_name)],
    ).ok();

    get_client_by_id_internal(&db, &id)
}

#[tauri::command]
pub async fn delete_client(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get folder path before deletion
    let folder_path: Option<String> = db
        .query_row(
            "SELECT folder_path FROM clients WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .ok();

    db.execute("DELETE FROM clients WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('DELETE', 'CLIENT', ?1, 'Client deleted')",
        params![id],
    ).ok();

    // Move folder to archive instead of hard delete
    if let Some(path) = folder_path {
        let src = std::path::Path::new(&path);
        if src.exists() {
            let archive_dir = state.app_data_dir.join("_Archived");
            std::fs::create_dir_all(&archive_dir).ok();
            let dest = archive_dir.join(src.file_name().unwrap_or_default());
            std::fs::rename(src, dest).ok();
        }
    }

    Ok(())
}
