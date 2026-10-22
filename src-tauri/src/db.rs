use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// One embedded SQL file per `user_version`. Adding a migration means running
/// `bunx drizzle-kit generate` and appending the new file here.
const MIGRATIONS: &[&str] = &[include_str!("../migrations/0000_init.sql")];

const STATEMENT_BREAKPOINT: &str = "--> statement-breakpoint";

/// SQLite connection shared by every Tauri command.
pub struct Db(pub Mutex<Connection>);

pub fn init(app: &AppHandle) -> Result<Db, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("cannot resolve app data dir: {error}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("cannot create {}: {error}", dir.display()))?;

    let mut conn = Connection::open(dir.join("posh.db"))
        .map_err(|error| format!("cannot open database: {error}"))?;

    // WAL keeps reads fast while a sale is being written; FKs must be enabled
    // per connection or the cascade on order_items is silently ignored.
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )
    .map_err(|error| format!("cannot configure database: {error}"))?;

    migrate(&mut conn)?;
    seed(&conn)?;

    Ok(Db(Mutex::new(conn)))
}

pub(crate) fn migrate(conn: &mut Connection) -> Result<(), String> {
    let current: i64 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|error| format!("cannot read schema version: {error}"))?;

    for (index, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        let version = (index + 1) as i64;
        let tx = conn
            .transaction()
            .map_err(|error| format!("cannot start migration {version}: {error}"))?;

        for statement in sql.split(STATEMENT_BREAKPOINT) {
            if statement.trim().is_empty() {
                continue;
            }
            tx.execute_batch(statement).map_err(|error| {
                format!("migration {version} failed on `{statement}`: {error}")
            })?;
        }

        tx.pragma_update(None, "user_version", version)
            .map_err(|error| format!("cannot record schema version {version}: {error}"))?;
        tx.commit()
            .map_err(|error| format!("cannot commit migration {version}: {error}"))?;
    }

    Ok(())
}

fn seed(conn: &Connection) -> Result<(), String> {
    let products: i64 = conn
        .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
        .map_err(|error| format!("cannot count products: {error}"))?;

    if products == 0 {
        const CATALOG: &[(&str, &str, i64, &str)] = &[
            ("Rolex", "ROL-001", 3_500, "Food"),
            ("Soda 500ml", "SOD-500", 1_500, "Drinks"),
            ("Samosa", "SAM-001", 1_000, "Snacks"),
            ("Bottled Water", "WAT-500", 1_000, "Drinks"),
        ];

        let mut stmt = conn
            .prepare("INSERT INTO products (name, sku, price, category) VALUES (?1, ?2, ?3, ?4)")
            .map_err(|error| format!("cannot prepare seed: {error}"))?;

        for (name, sku, price, category) in CATALOG {
            stmt.execute(rusqlite::params![name, sku, price, category])
                .map_err(|error| format!("cannot seed {name}: {error}"))?;
        }
    }

    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_rate', '18')",
        [],
    )
    .map_err(|error| format!("cannot seed settings: {error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn memory_db() -> Connection {
        let mut conn = Connection::open_in_memory().expect("open memory db");
        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .expect("enable foreign keys");
        migrate(&mut conn).expect("migrate");
        conn
    }

    #[test]
    fn migration_creates_the_schema() {
        let conn = memory_db();
        let tables: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'
                 AND name IN ('products', 'orders', 'order_items', 'settings')",
                [],
                |row| row.get(0),
            )
            .expect("count tables");
        assert_eq!(tables, 4);
    }

    #[test]
    fn migrations_are_idempotent() {
        let mut conn = memory_db();
        migrate(&mut conn).expect("second migrate is a no-op");
    }

    #[test]
    fn seed_is_idempotent_and_sets_default_vat() {
        let conn = memory_db();
        seed(&conn).expect("seed");
        seed(&conn).expect("seed again");

        let products: i64 = conn
            .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
            .expect("count products");
        assert_eq!(products, 4);

        let vat: String = conn
            .query_row("SELECT value FROM settings WHERE key = 'vat_rate'", [], |row| {
                row.get(0)
            })
            .expect("read vat");
        assert_eq!(vat, "18");
    }
}
