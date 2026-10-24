use crate::commands::{QueryRequest, execute, execute_batch};
use crate::db::Db;
use axum::{
    Json, Router,
    extract::State as AxumState,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use mdns_sd::{ResolvedService, ServiceDaemon, ServiceEvent, ServiceInfo};
use rusqlite::Connection;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::net::{IpAddr, Ipv4Addr};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::State;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;

const TOKEN_HEADER: &str = "x-posh-token";
const DEFAULT_PORT: u16 = 47_821;
const DISCOVERY_TYPE: &str = "_posh._tcp.local.";
const DISCOVERY_TIMEOUT_MS: u64 = 2_500;

#[derive(Clone)]
struct ApiState {
    conn: Arc<Mutex<Connection>>,
    token: String,
}

struct RunningServer {
    port: u16,
    token: String,
    till_name: String,
    till_code: String,
    shutdown: Option<oneshot::Sender<()>>,
    task: tauri::async_runtime::JoinHandle<()>,
    /// Kept alive so the advertisement disappears when the server stops.
    advertisement: Option<ServiceDaemon>,
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

/// One main till found by browsing the local network.
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredTill {
    /// The mDNS full name, used as a stable list key.
    pub id: String,
    pub name: String,
    pub code: String,
    pub address: String,
    pub port: u16,
    pub version: String,
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

    if let Some(RunningServer {
        shutdown,
        task,
        advertisement,
        ..
    }) = running
    {
        // Cleanup sends mDNS goodbyes, so clients stop seeing an old main till
        // soon instead of waiting for the record to expire.
        if let Some(daemon) = advertisement {
            let _ = daemon.shutdown();
        }

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
    till_name: String,
    till_code: String,
) -> Result<ServerInfo, String> {
    let token = token.trim().to_string();
    if token.len() < 8 {
        return Err("The till token must be at least 8 characters.".to_string());
    }

    let till_name = till_name.trim().to_string();
    if till_name.is_empty() || till_name.chars().count() > 40 {
        return Err("The till name must be 1–40 characters.".to_string());
    }

    let till_code = till_code.trim().to_uppercase();
    if !valid_till_code(&till_code) {
        return Err("The till code must be 1–4 letters or numbers, like T1.".to_string());
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
            running.port == port
                && running.token == token
                && running.till_name == till_name
                && running.till_code == till_code
                && !running.task.inner().is_finished()
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

    let advertisement = match advertise(port, &till_name, &till_code) {
        Ok(daemon) => Some(daemon),
        Err(error) => {
            // Discovery is a convenience. A firewall or a machine with no
            // usable LAN address must not stop the shop from trading.
            eprintln!("[lan] discovery is off: {error}");
            None
        }
    };

    let mut guard = server
        .0
        .lock()
        .map_err(|_| "server lock poisoned".to_string())?;
    *guard = Some(RunningServer {
        port,
        token,
        till_name,
        till_code,
        shutdown: Some(shutdown_tx),
        task,
        advertisement,
    });

    eprintln!("[lan] listening on 0.0.0.0:{port}");
    Ok(info(port))
}

/// Advertise this main till on the local network. Failure is not fatal.
fn advertise(port: u16, till_name: &str, till_code: &str) -> Result<ServiceDaemon, String> {
    let addresses = lan_addresses();
    if addresses.is_empty() {
        return Err("no LAN IPv4 address was found".to_string());
    }

    let daemon = ServiceDaemon::new().map_err(|error| format!("mDNS is unavailable: {error}"))?;
    let instance = format!("Posh {till_code}");
    let host = format!("posh-{}.local.", till_code.to_ascii_lowercase());
    let properties = [
        ("app", "posh"),
        ("name", till_name),
        ("code", till_code),
        ("version", env!("CARGO_PKG_VERSION")),
    ];

    let service = ServiceInfo::new(
        DISCOVERY_TYPE,
        &instance,
        &host,
        addresses.join(","),
        port,
        &properties[..],
    )
    .map_err(|error| format!("cannot build the discovery record: {error}"))?
    .enable_addr_auto();

    if let Err(error) = daemon.register(service) {
        let _ = daemon.shutdown();
        return Err(format!("cannot advertise this till: {error}"));
    }

    Ok(daemon)
}

/// Every usable IPv4 address, so a multi-homed main till is reachable from
/// whichever network the client is on.
fn lan_addresses() -> Vec<String> {
    let mut addresses = lan_ips();

    if addresses.is_empty() {
        addresses.extend(fallback_ip());
    }

    let mut addresses: Vec<String> = addresses.into_iter().map(|ip| ip.to_string()).collect();
    addresses.sort();
    addresses
}

fn lan_ips() -> HashSet<Ipv4Addr> {
    local_ip_address::list_afinet_netifas()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(_, ip)| match ip {
            IpAddr::V4(ip) if usable_ipv4(ip) => Some(ip),
            _ => None,
        })
        .collect()
}

/// The address to show a person. Prefer the usual shop ranges so a Docker or
/// virtual bridge does not become the address on the setup screen.
fn preferred_ip() -> Option<Ipv4Addr> {
    pick_address(lan_ips()).or_else(fallback_ip)
}

fn fallback_ip() -> Option<Ipv4Addr> {
    match local_ip_address::local_ip() {
        Ok(IpAddr::V4(ip)) if usable_ipv4(ip) => Some(ip),
        _ => None,
    }
}

fn usable_ipv4(ip: Ipv4Addr) -> bool {
    !ip.is_unspecified()
        && !ip.is_loopback()
        && !ip.is_link_local()
        && !ip.is_multicast()
        && !ip.is_broadcast()
}

fn valid_till_code(code: &str) -> bool {
    let code = code.trim();
    !code.is_empty()
        && code.len() <= 4
        && code
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
}

/// Browse for main tills. Runs on a blocking thread because mDNS resolution
/// waits on a channel; the UI gets an answer after a short, fixed window.
#[tauri::command]
pub async fn discover_tills(timeout_ms: Option<u64>) -> Result<Vec<DiscoveredTill>, String> {
    let timeout =
        Duration::from_millis(timeout_ms.unwrap_or(DISCOVERY_TIMEOUT_MS).clamp(500, 5_000));

    tauri::async_runtime::spawn_blocking(move || discover(timeout))
        .await
        .map_err(|error| format!("the discovery search stopped unexpectedly: {error}"))?
}

fn discover(timeout: Duration) -> Result<Vec<DiscoveredTill>, String> {
    let daemon = ServiceDaemon::new().map_err(|error| format!("mDNS is unavailable: {error}"))?;
    let receiver = match daemon.browse(DISCOVERY_TYPE) {
        Ok(receiver) => receiver,
        Err(error) => {
            let _ = daemon.shutdown();
            return Err(format!("cannot search the network: {error}"));
        }
    };

    let deadline = Instant::now() + timeout;
    let mut found: HashMap<String, DiscoveredTill> = HashMap::new();

    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            break;
        }

        match receiver.recv_timeout(remaining) {
            Ok(ServiceEvent::ServiceResolved(info)) => {
                if let Some(till) = till_from_resolved(&info) {
                    found.insert(till.id.clone(), till);
                }
            }
            Ok(_) => {}
            // A timeout means the search window closed; anything else means
            // the daemon stopped. Either way, return what we have.
            Err(_) => break,
        }
    }

    let _ = daemon.stop_browse(DISCOVERY_TYPE);
    let _ = daemon.shutdown();

    let mut tills: Vec<DiscoveredTill> = found.into_values().collect();
    tills.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then_with(|| left.code.cmp(&right.code))
            .then_with(|| left.address.cmp(&right.address))
    });
    Ok(tills)
}

fn till_from_resolved(info: &ResolvedService) -> Option<DiscoveredTill> {
    // Ignore other mDNS services even if they reuse our type.
    if info.get_property_val_str("app") != Some("posh") {
        return None;
    }

    let name = info.get_property_val_str("name").map(str::trim)?;
    if name.is_empty() {
        return None;
    }

    let code = info
        .get_property_val_str("code")
        .map(str::trim)?
        .to_uppercase();
    if !valid_till_code(&code) {
        return None;
    }

    let port = info.get_port();
    if port == 0 {
        return None;
    }

    Some(DiscoveredTill {
        id: info.get_fullname().to_string(),
        name: name.to_string(),
        code,
        address: pick_address(info.get_addresses_v4())?.to_string(),
        port,
        version: info
            .get_property_val_str("version")
            .unwrap_or_default()
            .to_string(),
    })
}

/// Prefer the usual private LAN ranges; fall back to any usable IPv4.
fn pick_address(addresses: HashSet<Ipv4Addr>) -> Option<Ipv4Addr> {
    addresses
        .into_iter()
        .filter(|ip| usable_ipv4(*ip))
        .min_by_key(|ip| (address_rank(*ip), *ip))
}

fn address_rank(ip: Ipv4Addr) -> u8 {
    let octets = ip.octets();
    match (octets[0], octets[1]) {
        (192, 168) => 0,
        (10, _) => 1,
        (172, 16..=31) => 2,
        _ => 3,
    }
}

/// The address a client should type. The server still binds every interface;
/// this is only the friendly address shown on screen.
#[tauri::command]
pub fn lan_info(port: Option<u16>) -> ServerInfo {
    info(port.unwrap_or(DEFAULT_PORT))
}

fn info(port: u16) -> ServerInfo {
    ServerInfo {
        ip: preferred_ip().map(|ip| ip.to_string()),
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

    #[test]
    fn till_codes_are_short_and_alphanumeric() {
        assert!(valid_till_code("T1"));
        assert!(valid_till_code("ab12"));
        assert!(!valid_till_code(""));
        assert!(!valid_till_code("T 1"));
        assert!(!valid_till_code("TOOLONG"));
        assert!(!valid_till_code("é"));
    }

    #[test]
    fn discovery_prefers_the_private_lan_address() {
        let addresses = HashSet::from([
            Ipv4Addr::new(169, 254, 10, 2),
            Ipv4Addr::new(203, 0, 113, 9),
            Ipv4Addr::new(192, 168, 1, 20),
            Ipv4Addr::new(10, 0, 0, 5),
            Ipv4Addr::new(127, 0, 0, 1),
        ]);

        assert_eq!(
            pick_address(addresses),
            Some(Ipv4Addr::new(192, 168, 1, 20))
        );
    }

    #[test]
    fn discovery_ignores_unusable_addresses() {
        let addresses = HashSet::from([
            Ipv4Addr::LOCALHOST,
            Ipv4Addr::new(169, 254, 1, 1),
            Ipv4Addr::UNSPECIFIED,
        ]);

        assert_eq!(pick_address(addresses), None);
    }

    #[test]
    #[ignore = "requires a multicast-capable LAN interface"]
    fn discovery_finds_an_advertised_till() {
        let daemon = advertise(47_899, "Discovery test", "T9").unwrap();
        let found = discover(Duration::from_secs(2)).unwrap();
        let _ = daemon.shutdown();

        assert!(
            found
                .iter()
                .any(|till| till.code == "T9" && till.name == "Discovery test"),
            "expected the advertised till, found {found:?}"
        );
    }
}
