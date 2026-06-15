// Google Drive API integration helpers
// Used by both commands/drive.rs and sync.rs

pub async fn refresh_access_token(
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    data["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to refresh token".to_string())
}

pub async fn create_drive_folder(
    access_token: &str,
    name: &str,
    parent_id: Option<&str>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut body = serde_json::json!({
        "name": name,
        "mimeType": "application/vnd.google-apps.folder"
    });
    if let Some(pid) = parent_id {
        body["parents"] = serde_json::json!([pid]);
    }

    let response = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    data["id"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No folder ID returned".to_string())
}

pub async fn upload_file_to_drive(
    access_token: &str,
    file_path: &std::path::Path,
    parent_folder_id: &str,
) -> Result<String, String> {
    let file_name = file_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let content = std::fs::read(file_path).map_err(|e| e.to_string())?;

    let metadata = serde_json::json!({
        "name": file_name,
        "parents": [parent_folder_id]
    });

    let client = reqwest::Client::new();
    let form = reqwest::multipart::Form::new()
        .part(
            "metadata",
            reqwest::multipart::Part::text(metadata.to_string())
                .mime_str("application/json")
                .unwrap(),
        )
        .part(
            "file",
            reqwest::multipart::Part::bytes(content)
                .file_name(file_name)
                .mime_str("application/octet-stream")
                .unwrap(),
        );

    let response = client
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
        .bearer_auth(access_token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    data["id"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No file ID returned".to_string())
}
