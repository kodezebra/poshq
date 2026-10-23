mod commands;
mod db;
mod server;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let database = db::init(app.handle()).map_err(std::io::Error::other)?;
            app.manage(database);
            app.manage(server::LanServer::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_query,
            commands::db_batch,
            server::start_lan_server,
            server::stop_lan_server,
            server::lan_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
