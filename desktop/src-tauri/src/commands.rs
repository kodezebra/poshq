use crate::db::Db;
use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{Connection, params_from_iter};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

/// Mirrors Drizzle's `sqlite-proxy` callback: one statement per request.
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub sql: String,
    pub params: Vec<Value>,
    /// Drizzle's execute method: `run`, `all`, `get` or `values`.
    pub method: String,
}

/// `rows` is `null` when a `get` matched nothing — Drizzle maps that to
/// `undefined`. `all`/`values` return an array of positional row arrays.
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResponse {
    pub rows: Option<Vec<Value>>,
}

fn to_sql_value(value: &Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Bool(flag) => SqlValue::Integer(i64::from(*flag)),
        Value::Number(number) => number
            .as_i64()
            .map(SqlValue::Integer)
            .or_else(|| number.as_f64().map(SqlValue::Real))
            .unwrap_or(SqlValue::Null),
        Value::String(text) => SqlValue::Text(text.clone()),
        Value::Array(bytes) => SqlValue::Blob(
            bytes
                .iter()
                .filter_map(Value::as_u64)
                .map(|byte| byte as u8)
                .collect(),
        ),
        Value::Object(_) => SqlValue::Null,
    }
}

fn from_sql_value(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(integer) => Value::from(integer),
        ValueRef::Real(real) => serde_json::Number::from_f64(real)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueRef::Text(text) => Value::String(String::from_utf8_lossy(text).into_owned()),
        ValueRef::Blob(blob) => Value::Array(blob.iter().map(|byte| Value::from(*byte)).collect()),
    }
}

/**
 * Log the statement that failed for the developer console, then hand the UI a
 * message that carries no SQL. The statement is the most useful thing to have
 * while debugging, and the least useful thing to show a cashier.
 */
fn fail(sql: &str, error: impl std::fmt::Display) -> String {
    eprintln!("[db] {sql}: {error}");
    error.to_string()
}

pub(crate) fn execute(conn: &Connection, request: &QueryRequest) -> Result<QueryResponse, String> {
    let params: Vec<SqlValue> = request.params.iter().map(to_sql_value).collect();

    if request.method == "run" {
        conn.execute(&request.sql, params_from_iter(params))
            .map_err(|error| fail(&request.sql, error))?;
        return Ok(QueryResponse {
            rows: Some(Vec::new()),
        });
    }

    let mut statement = conn
        .prepare(&request.sql)
        .map_err(|error| fail(&request.sql, error))?;
    let columns = statement.column_count();
    let mut rows = statement
        .query(params_from_iter(params))
        .map_err(|error| fail(&request.sql, error))?;

    let mut collected: Vec<Value> = Vec::new();
    while let Some(row) = rows.next().map_err(|error| fail(&request.sql, error))? {
        let mut values = Vec::with_capacity(columns);
        for index in 0..columns {
            let value = row
                .get_ref(index)
                .map_err(|error| fail(&request.sql, error))?;
            values.push(from_sql_value(value));
        }
        collected.push(Value::Array(values));
    }

    if request.method == "get" {
        // Drizzle expects a single flat row for `get`.
        let first = collected.into_iter().next().and_then(|row| match row {
            Value::Array(values) => Some(values),
            _ => None,
        });
        return Ok(QueryResponse { rows: first });
    }

    Ok(QueryResponse {
        rows: Some(collected),
    })
}

pub(crate) fn execute_batch(
    conn: &mut Connection,
    batch: &[QueryRequest],
) -> Result<Vec<QueryResponse>, String> {
    let tx = conn
        .transaction()
        .map_err(|error| format!("cannot start transaction: {error}"))?;

    let mut results = Vec::with_capacity(batch.len());
    for request in batch {
        results.push(execute(&tx, request)?);
    }

    tx.commit()
        .map_err(|error| format!("cannot commit transaction: {error}"))?;
    Ok(results)
}

#[tauri::command]
pub fn db_query(db: State<'_, Db>, request: QueryRequest) -> Result<QueryResponse, String> {
    let conn =
        db.0.lock()
            .map_err(|_| "database lock poisoned".to_string())?;
    execute(&conn, &request)
}

/// Runs a whole Drizzle `db.batch([...])` inside one SQLite transaction, so a
/// sale and its line items either both land or neither does.
#[tauri::command]
pub fn db_batch(db: State<'_, Db>, batch: Vec<QueryRequest>) -> Result<Vec<QueryResponse>, String> {
    let mut conn =
        db.0.lock()
            .map_err(|_| "database lock poisoned".to_string())?;
    execute_batch(&mut conn, &batch)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn memory_db() -> Connection {
        let mut conn = Connection::open_in_memory().expect("open memory db");
        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .expect("enable foreign keys");
        db::migrate(&mut conn).expect("migrate");
        conn
    }

    fn request(sql: &str, params: Vec<Value>, method: &str) -> QueryRequest {
        QueryRequest {
            sql: sql.to_string(),
            params,
            method: method.to_string(),
        }
    }

    fn rows(response: QueryResponse) -> Vec<Value> {
        response.rows.expect("rows")
    }

    #[test]
    fn run_then_all_round_trips_values() {
        let conn = memory_db();

        execute(
            &conn,
            &request(
                "INSERT INTO products (name, sku, price, category) VALUES (?, ?, ?, ?)",
                vec![
                    Value::from("Rolex"),
                    Value::from("ROL-001"),
                    Value::from(3_500),
                    Value::from("Food"),
                ],
                "run",
            ),
        )
        .expect("insert");

        let response = execute(
            &conn,
            &request(
                "SELECT name, price, active FROM products WHERE sku = ?",
                vec![Value::from("ROL-001")],
                "all",
            ),
        )
        .expect("select");

        assert_eq!(
            rows(response),
            vec![Value::Array(vec![
                Value::from("Rolex"),
                Value::from(3_500),
                Value::from(1),
            ])]
        );
    }

    #[test]
    fn get_returns_a_flat_row_or_null() {
        let conn = memory_db();

        execute(
            &conn,
            &request(
                "INSERT INTO products (name, sku, price, category) VALUES (?, ?, ?, ?)",
                vec![
                    Value::from("Rolex"),
                    Value::from("ROL-001"),
                    Value::from(3_500),
                    Value::from("Food"),
                ],
                "run",
            ),
        )
        .expect("insert");

        let hit = execute(
            &conn,
            &request(
                "SELECT price FROM products WHERE name = ?",
                vec![Value::from("Rolex")],
                "get",
            ),
        )
        .expect("get");
        assert_eq!(hit.rows, Some(vec![Value::from(3_500)]));

        let miss = execute(
            &conn,
            &request(
                "SELECT price FROM products WHERE name = ?",
                vec![Value::from("Nope")],
                "get",
            ),
        )
        .expect("miss");
        assert_eq!(miss.rows, None);
    }

    #[test]
    fn batch_commits_every_statement() {
        let mut conn = memory_db();

        execute_batch(
            &mut conn,
            &[
                request(
                    "INSERT INTO orders (id, order_no, subtotal, tax, total) VALUES (?, ?, ?, ?, ?)",
                    vec![
                        Value::from("order-1"),
                        Value::from("POS-TEST-1"),
                        Value::from(5_000),
                        Value::from(900),
                        Value::from(5_900),
                    ],
                    "run",
                ),
                request(
                    "INSERT INTO order_items (order_id, product_id, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?)",
                    vec![
                        Value::from("order-1"),
                        Value::Null,
                        Value::from("Rolex"),
                        Value::from(5_000),
                        Value::from(1),
                        Value::from(5_000),
                    ],
                    "run",
                ),
            ],
        )
        .expect("batch");

        let items: i64 = conn
            .query_row("SELECT COUNT(*) FROM order_items", [], |row| row.get(0))
            .expect("count items");
        assert_eq!(items, 1);
    }

    #[test]
    fn failed_query_reports_the_reason_without_the_statement() {
        let conn = memory_db();

        let insert = |sku: &str| {
            request(
                "INSERT INTO products (name, sku, price, category) VALUES (?, ?, ?, ?)",
                vec![
                    Value::from("Rolex"),
                    Value::from(sku),
                    Value::from(3_500),
                    Value::from("Food"),
                ],
                "run",
            )
        };

        execute(&conn, &insert("ROL-001")).expect("insert");
        let error = execute(&conn, &insert("ROL-001")).expect_err("duplicate sku");

        assert!(
            !error.to_lowercase().contains("insert into"),
            "error leaked the statement: {error}"
        );
        assert!(
            !error.contains("VALUES"),
            "error leaked the statement: {error}"
        );
        assert!(!error.contains('?'), "error leaked the statement: {error}");
        assert!(
            error.contains("UNIQUE constraint failed"),
            "error lost the reason: {error}"
        );
    }

    #[test]
    fn failed_batch_rolls_back() {
        let mut conn = memory_db();

        let result = execute_batch(
            &mut conn,
            &[
                request(
                    "INSERT INTO orders (id, order_no, subtotal, tax, total) VALUES (?, ?, ?, ?, ?)",
                    vec![
                        Value::from("order-2"),
                        Value::from("POS-TEST-2"),
                        Value::from(1_000),
                        Value::from(180),
                        Value::from(1_180),
                    ],
                    "run",
                ),
                request(
                    "INSERT INTO order_items (order_id, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?)",
                    vec![
                        Value::from("missing-order"),
                        Value::from("Broken"),
                        Value::from(1_000),
                        Value::from(1),
                        Value::from(1_000),
                    ],
                    "run",
                ),
            ],
        );

        assert!(result.is_err());
        let orders: i64 = conn
            .query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
            .expect("count orders");
        assert_eq!(orders, 0);
    }
}
