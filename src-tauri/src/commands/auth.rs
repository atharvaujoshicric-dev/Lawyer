use crate::AppState;
use sha2::{Digest, Sha256};
use tauri::State;

fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}

#[tauri::command]
pub async fn is_first_run(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM app_config WHERE key = 'master_password_hash'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count == 0)
}

#[tauri::command]
pub async fn setup_master_password(
    password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }
    let hash = hash_password(&password);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('master_password_hash', ?1)",
        rusqlite::params![hash],
    )
    .map_err(|e| e.to_string())?;
    // Log the setup
    db.execute(
        "INSERT INTO activity_log (action, entity_type, details) VALUES ('SETUP', 'APP', 'Master password configured')",
        [],
    ).ok();
    Ok(())
}

#[tauri::command]
pub async fn verify_master_password(
    password: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let hash = hash_password(&password);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let stored_hash: Option<String> = db
        .query_row(
            "SELECT value FROM app_config WHERE key = 'master_password_hash'",
            [],
            |row| row.get(0),
        )
        .ok();

    let valid = stored_hash.map_or(false, |h| h == hash);
    if valid {
        db.execute(
            "INSERT INTO activity_log (action, entity_type, details) VALUES ('LOGIN', 'APP', 'Successful login')",
            [],
        ).ok();
    }
    Ok(valid)
}
