// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod drive;
mod models;
mod sync;

use std::sync::Mutex;
use tauri::{Manager, State};

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    pub app_data_dir: std::path::PathBuf,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path_resolver()
                .app_data_dir()
                .expect("Failed to get app data dir");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("master_tracker.db");
            let conn = db::initialize_database(&db_path)
                .expect("Failed to initialize database");

            app.manage(AppState {
                db: Mutex::new(conn),
                app_data_dir,
            });

            // Start background sync checker
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                sync::start_background_sync(app_handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::setup_master_password,
            commands::auth::verify_master_password,
            commands::auth::is_first_run,
            commands::clients::create_client,
            commands::clients::get_all_clients,
            commands::clients::get_client_by_id,
            commands::clients::update_client,
            commands::clients::delete_client,
            commands::clients::search_clients,
            commands::cases::create_case,
            commands::cases::get_cases_by_client,
            commands::cases::get_case_by_id,
            commands::cases::update_case,
            commands::cases::delete_case,
            commands::cases::get_expiring_soon,
            commands::drive::initiate_google_auth,
            commands::drive::exchange_auth_code,
            commands::drive::get_drive_sync_status,
            commands::drive::sync_now,
            commands::drive::get_drive_folder_url,
            commands::files::open_client_folder,
            commands::files::get_client_files,
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_recent_activity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
