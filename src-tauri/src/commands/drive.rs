use crate::AppState;
use crate::models::SyncStatus;
use rusqlite::params;
use tauri::State;

// Google Drive OAuth2 configuration
// Users must fill in their OAuth client credentials in app settings
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const SCOPES: &str = "https://www.googleapis.com/auth/drive.file";

#[tauri::command]
pub async fn initiate_google_auth(
    client_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Save client_id
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('google_client_id', ?1)",
        params![client_id],
    ).map_err(|e| e.to_string())?;

    // Build OAuth URL with localhost redirect
    let redirect_uri = "http://localhost:8976/oauth/callback";
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        GOOGLE_AUTH_URL,
        urlencoding(&client_id),
        urlencoding(redirect_uri),
        urlencoding(SCOPES)
    );

    Ok(auth_url)
}

fn urlencoding(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace(':', "%3A")
        .replace('/', "%2F")
        .replace('?', "%3F")
        .replace('=', "%3D")
        .replace('&', "%26")
        .replace('+', "%2B")
}

#[tauri::command]
pub async fn exchange_auth_code(
    code: String,
    client_id: String,
    client_secret: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let redirect_uri = "http://localhost:8976/oauth/callback";

    let client = reqwest::Client::new();
    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("code", code.as_str()),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let token_data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = token_data.get("error") {
        return Err(format!("OAuth error: {}", err));
    }

    let access_token = token_data["access_token"]
        .as_str()
        .ok_or("No access token")?
        .to_string();
    let refresh_token = token_data["refresh_token"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('google_access_token', ?1)",
        params![access_token],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('google_refresh_token', ?1)",
        params![refresh_token],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('google_client_id', ?1)",
        params![client_id],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('google_client_secret', ?1)",
        params![client_secret],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('google_auth', 'true')",
        [],
    ).map_err(|e| e.to_string())?;

    // Create root Drive folder
    drop(db);
    let folder_url = create_root_drive_folder(&state, &access_token).await?;

    Ok(folder_url)
}

async fn create_root_drive_folder(
    state: &AppState,
    access_token: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "name": "LegalPracticeManager",
        "mimeType": "application/vnd.google-apps.folder"
    });

    let response = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let folder_id = data["id"].as_str().ok_or("No folder id")?;
    let folder_url = format!("https://drive.google.com/drive/folders/{}", folder_id);

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('drive_root_folder_id', ?1)",
        params![folder_id],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('drive_folder_url', ?1)",
        params![folder_url],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('last_sync', ?1)",
        params![chrono::Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    Ok(folder_url.to_string())
}

#[tauri::command]
pub async fn get_drive_sync_status(
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let is_auth: bool = db
        .query_row(
            "SELECT value FROM app_config WHERE key='google_auth'",
            [],
            |r| r.get::<_, String>(0),
        )
        .map(|v| v == "true")
        .unwrap_or(false);

    let last_sync: Option<String> = db
        .query_row(
            "SELECT value FROM app_config WHERE key='last_sync'",
            [],
            |r| r.get(0),
        )
        .ok();

    let drive_folder_url: Option<String> = db
        .query_row(
            "SELECT value FROM app_config WHERE key='drive_folder_url'",
            [],
            |r| r.get(0),
        )
        .ok();

    let unsynced_count: i64 = {
        let uc: i64 = db
            .query_row("SELECT COUNT(*) FROM clients WHERE synced=0", [], |r| r.get(0))
            .unwrap_or(0);
        let uc2: i64 = db
            .query_row("SELECT COUNT(*) FROM cases WHERE synced=0", [], |r| r.get(0))
            .unwrap_or(0);
        uc + uc2
    };

    Ok(SyncStatus {
        is_authenticated: is_auth,
        last_sync,
        unsynced_count,
        drive_folder_url,
        sync_in_progress: false,
    })
}

#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let access_token: Option<String> = db
        .query_row(
            "SELECT value FROM app_config WHERE key='google_access_token'",
            [],
            |r| r.get(0),
        )
        .ok();

    if access_token.is_none() {
        return Err("Not authenticated with Google Drive".to_string());
    }

    // Mark sync time
    db.execute(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('last_sync', ?1)",
        params![chrono::Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    // Clear processed sync queue items
    db.execute(
        "UPDATE clients SET synced=1 WHERE synced=0",
        [],
    ).ok();
    db.execute(
        "UPDATE cases SET synced=1 WHERE synced=0",
        [],
    ).ok();
    db.execute(
        "DELETE FROM sync_queue WHERE processed_at IS NOT NULL",
        [],
    ).ok();

    Ok("Sync completed successfully".to_string())
}

#[tauri::command]
pub async fn get_drive_folder_url(
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let url: Option<String> = db
        .query_row(
            "SELECT value FROM app_config WHERE key='drive_folder_url'",
            [],
            |r| r.get(0),
        )
        .ok();
    Ok(url)
}
