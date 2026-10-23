use crate::commands::{QueryRequest, execute, execute_batch};
use crate::db::Db;
use axum::{
    Json, Router,
    extract::State as AxumState,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use rusqlite::Connection;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::State;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;

const TOKEN_HEADER: &str = "x-posh-token";
const DEFAULT_PORT: u16 = 47_821;

#[derive(Clone)]
struct ApiState {
    conn: Arc<Mutex<Connection>>,
    token: String,
}

struct RunningServer {
    port: u16,
    token: String,
    shutdown: Option<oneshot::Sender<()>>,
    task: tauri::async_runtime::JoinHandle<()>,
}

/// Owns the optional LAN listener so a role change can stop it cleanly.
#[derive(Default)]
pub struct LanServer(Mutex<Option<RunningServer>>);

#[derive(Debug, Serialize)]
pub struct ServerInfo {
    /** The first LAN address, when the OS reports one. */
    pub ip: Option<String>,
    pub port: u16,
}

#[derive(Serialize)]
struct Health {
    ok: bool,
    app: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
struct ApiError {
    error: String,
}

fn error(status: StatusCode, message: impl Into<String>) -> Response {
    (
        status,
        Json(ApiError {
            error: message.into(),
        }),
    )
        .into_response()
}

fn authorized(headers: &HeaderMap, expected: &str) -> bool {
    headers
        .get(TOKEN_HEADER)
        .and_then(|value| value.to_str().ok())
        == Some(expected)
}

async fn health(AxumState(state): AxumState<ApiState>, headers: HeaderMap) -> Response {
    if !authorized(&headers, &state.token) {
        return error(StatusCode::UNAUTHORIZED, "The till token is not valid.");
    }

    Json(Health {
        ok: true,
        app: "Posh",
        version: env!("CARGO_PKG_VERSION"),
    })
    .into_response()
}

async fn query(
    AxumState(state): AxumState<ApiState>,
    headers: HeaderMap,
    Json(request): Json<QueryRequest>,
) -> Response {
    if !authorized(&headers, &state.token) {
        return error(StatusCode::UNAUTHORIZED, "The till token is not valid.");
    }

    let conn = match state.conn.lock() {
        Ok(conn) => conn,
        Err(_) => return error(StatusCode::INTERNAL_SERVER_ERROR, "database lock poisoned"),
    };

    match execute(&conn, &request) {
        Ok(response) => Json(response).into_response(),
        Err(message) => error(StatusCode::BAD_REQUEST, message),
    }
}

async fn batch(
    AxumState(state): AxumState<ApiState>,
    headers: HeaderMap,
    Json(requests): Json<Vec<QueryRequest>>,
) -> Response {
    if !authorized(&headers, &state.token) {
        return error(StatusCode::UNAUTHORIZED, "The till token is not valid.");
    }

    let mut conn = match state.conn.lock() {
        Ok(conn) => conn,
        Err(_) => return error(StatusCode::INTERNAL_SERVER_ERROR, "database lock poisoned"),
    };

    match execute_batch(&mut conn, &requests) {
        Ok(responses) => Json(responses).into_response(),
        Err(message) => error(StatusCode::BAD_REQUEST, message),
    }
}

fn router(conn: Arc<Mutex<Connection>>, token: String) -> Router {
    let state = ApiState { conn, token };

    Router::new()
        .route("/health", get(health))
        .route("/api/db/query", post(query))
        .route("/api/db/batch", post(batch))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

async fn stop(server: &LanServer) {
    let running = server.0.lock().ok().and_then(|mut guard| guard.take());

    if let Some(RunningServer { shutdown, task, .. }) = running {
        if let Some(shutdown) = shutdown {
            let _ = shutdown.send(());
        }
        // Await the listener closing so a new token or role can reuse the port
        // immediately instead of racing the old accept loop.
        let _ = task.await;
    }
}

/// Stop the current listener, if any. Safe to call when the app is a client.
#[tauri::command]
pub async fn stop_lan_server(server: State<'_, LanServer>) -> Result<(), String> {
    stop(&server).await;
    Ok(())
}

/// Start the LAN API on every interface. Calling it again with the same
/// token and port is a no-op, which keeps an app reload cheap.
#[tauri::command]
pub async fn start_lan_server(
    db: State<'_, Db>,
    server: State<'_, LanServer>,
    token: String,
    port: Option<u16>,
) -> Result<ServerInfo, String> {
    let token = token.trim().to_string();
    if token.len() < 8 {
        return Err("The till token must be at least 8 characters.".to_string());
    }

    let port = port.unwrap_or(DEFAULT_PORT);
    if port == 0 {
        return Err("The LAN port must be between 1 and 65535.".to_string());
    }

    {
        let guard = server
            .0
            .lock()
            .map_err(|_| "server lock poisoned".to_string())?;

        let already_running = guard.as_ref().is_some_and(|running| {
            running.port == port && running.token == token && !running.task.inner().is_finished()
        });
        if already_running {
            return Ok(info(port));
        }
    }

    stop(&server).await;

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .map_err(|error| format!("cannot listen on port {port}: {error}"))?;

    let conn = Arc::clone(&db.0);
    let app = router(conn, token.clone());
    let (shutdown_tx, shutdown_rx) = oneshot::channel();

    let task = tauri::async_runtime::spawn(async move {
        let result = axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await;

        if let Err(error) = result {
            eprintln!("[lan] server stopped: {error}");
        }
    });

    let mut guard = server
        .0
        .lock()
        .map_err(|_| "server lock poisoned".to_string())?;
    *guard = Some(RunningServer {
        port,
        token,
        shutdown: Some(shutdown_tx),
        task,
    });

    eprintln!("[lan] listening on 0.0.0.0:{port}");
    Ok(info(port))
}

/// The address a client should type. The server still binds every interface;
/// this is only the friendly address shown on screen.
#[tauri::command]
pub fn lan_info(port: Option<u16>) -> ServerInfo {
    info(port.unwrap_or(DEFAULT_PORT))
}

fn info(port: u16) -> ServerInfo {
    ServerInfo {
        ip: local_ip_address::local_ip().ok().map(|ip| ip.to_string()),
        port,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_must_match() {
        let mut headers = HeaderMap::new();
        headers.insert(TOKEN_HEADER, "secret-token".parse().unwrap());
        assert!(authorized(&headers, "secret-token"));
        assert!(!authorized(&headers, "other-token"));
        assert!(!authorized(&HeaderMap::new(), "secret-token"));
    }
}
