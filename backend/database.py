import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent


def _db_path() -> Path:
    configured = os.getenv("DATABASE_PATH", "shoppilot.db").strip() or "shoppilot.db"
    path = Path(configured)
    if not path.is_absolute():
        path = BACKEND_DIR / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def get_connection():
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paypal_order_id TEXT NOT NULL UNIQUE,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                total_price REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                status TEXT NOT NULL,
                payer_email TEXT,
                created_at TEXT NOT NULL,
                capture_json TEXT
            )
            """
        )


def _row_to_order(row: sqlite3.Row) -> Dict[str, Any]:
    order = dict(row)
    order["order_id"] = order["paypal_order_id"]
    capture_json = order.pop("capture_json", None)
    if capture_json:
        try:
            order["capture"] = json.loads(capture_json)
        except json.JSONDecodeError:
            order["capture"] = None
    return order


def get_order_by_paypal_id(paypal_order_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM orders WHERE paypal_order_id = ?", (paypal_order_id,)
        ).fetchone()
    return _row_to_order(row) if row else None


def save_order(
    paypal_order_id: str,
    product_id: str,
    product_name: str,
    total_price: float,
    currency: str,
    status: str,
    payer_email: Optional[str],
    capture: Dict[str, Any],
) -> Dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO orders
                (paypal_order_id, product_id, product_name, total_price, currency,
                 status, payer_email, created_at, capture_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                paypal_order_id,
                product_id,
                product_name,
                float(total_price),
                currency,
                status,
                payer_email,
                created_at,
                json.dumps(capture),
            ),
        )
        row = conn.execute(
            "SELECT * FROM orders WHERE paypal_order_id = ?", (paypal_order_id,)
        ).fetchone()
    return _row_to_order(row)


def list_orders() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM orders ORDER BY id DESC"
        ).fetchall()
    return [_row_to_order(row) for row in rows]
