use tauri::AppHandle;

pub async fn start_background_sync(app: AppHandle) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // 5 min
    loop {
        interval.tick().await;
        check_reminders(&app).await;
        // The actual Drive sync is triggered manually or on queue flush
    }
}

async fn check_reminders(app: &AppHandle) {
    let state = app.state::<crate::AppState>();
    if let Ok(db) = state.db.lock() {
        // Check for upcoming deadlines and issue notifications
        let threshold_days = [7i64, 30, 60];
        for days in threshold_days {
            let col = match days {
                7 => "notified_7",
                30 => "notified_30",
                _ => "notified_60",
            };
            let query = format!(
                "SELECT r.id, r.title, c.full_name, r.due_date
                 FROM reminders r
                 LEFT JOIN clients c ON r.client_id = c.id
                 WHERE r.dismissed = 0 AND r.{} = 0
                 AND julianday(r.due_date) BETWEEN julianday('now') AND julianday('now') + {}",
                col, days
            );
            if let Ok(mut stmt) = db.prepare(&query) {
                let results: Vec<(String, String, String, String)> = stmt
                    .query_map([], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2).unwrap_or_default(),
                            row.get::<_, String>(3)?,
                        ))
                    })
                    .unwrap_or_else(|_| Box::new(std::iter::empty()))
                    .filter_map(|r| r.ok())
                    .collect();

                for (id, title, client_name, due_date) in results {
                    let msg = format!(
                        "{} — {} (Due: {})\n{} days remaining",
                        client_name, title, due_date, days
                    );
                    let _ = tauri::api::notification::Notification::new(&app.config().tauri.bundle.identifier)
                        .title(format!("⚠️ Deadline Alert — {} Days", days))
                        .body(&msg)
                        .show();

                    let _ = db.execute(
                        &format!("UPDATE reminders SET {} = 1 WHERE id = ?1", col),
                        rusqlite::params![id],
                    );
                }
            }
        }
    }
}
