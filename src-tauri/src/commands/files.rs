use crate::AppState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub async fn open_client_folder(
    client_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let folder_path: Option<String> = db
        .query_row(
            "SELECT folder_path FROM clients WHERE id = ?1",
            params![client_id],
            |r| r.get(0),
        )
        .ok();

    drop(db);

    if let Some(path) = folder_path {
        let p = std::path::Path::new(&path);
        if p.exists() {
            open::that(p).map_err(|e| e.to_string())?;
        } else {
            return Err("Folder not found on disk".to_string());
        }
    } else {
        return Err("Client folder not configured".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn get_client_files(
    client_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let folder_path: Option<String> = db
        .query_row(
            "SELECT folder_path FROM clients WHERE id = ?1",
            params![client_id],
            |r| r.get(0),
        )
        .ok();

    drop(db);

    let mut files = Vec::new();
    if let Some(path) = folder_path {
        let p = std::path::Path::new(&path);
        if p.exists() {
            collect_files(p, &mut files)?;
        }
    }
    Ok(files)
}

fn collect_files(
    dir: &std::path::Path,
    files: &mut Vec<serde_json::Value>,
) -> Result<(), String> {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let meta = entry.metadata().map_err(|e| e.to_string())?;
            if meta.is_file() {
                files.push(serde_json::json!({
                    "name": path.file_name().unwrap_or_default().to_string_lossy(),
                    "path": path.to_string_lossy(),
                    "size": meta.len(),
                    "is_dir": false,
                }));
            } else if meta.is_dir() {
                files.push(serde_json::json!({
                    "name": path.file_name().unwrap_or_default().to_string_lossy(),
                    "path": path.to_string_lossy(),
                    "size": 0,
                    "is_dir": true,
                }));
            }
        }
    }
    Ok(())
}
