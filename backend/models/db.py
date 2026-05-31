import logging
import os
import sqlite3
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger(__name__)

DB_PATH: str = os.environ.get("DATABASE_URL", "backend/db/kakeibo.sqlite3")

CATEGORIES: list[dict] = [
    {"id": 1, "name": "食料品", "icon": "fa-solid fa-basket-shopping"},
    {"id": 2, "name": "外食", "icon": "fa-solid fa-utensils"},
    {"id": 3, "name": "交通", "icon": "fa-solid fa-train"},
    {"id": 4, "name": "医療・健康", "icon": "fa-solid fa-heart-pulse"},
    {"id": 5, "name": "衣類・美容", "icon": "fa-solid fa-shirt"},
    {"id": 6, "name": "日用品", "icon": "fa-solid fa-soap"},
    {"id": 7, "name": "娯楽", "icon": "fa-solid fa-gamepad"},
    {"id": 8, "name": "その他", "icon": "fa-solid fa-circle-dot"},
]

CREATE_SESSIONS_TABLE = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL
)
"""

CREATE_EXPENSES_TABLE = """
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    date DATE NOT NULL,
    amount INTEGER NOT NULL,
    store_name TEXT,
    memo TEXT,
    ocr_raw_text TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
)
"""

CREATE_CATEGORIES_TABLE = """
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL
)
"""

INSERT_CATEGORY = """
INSERT INTO categories (id, name, icon)
SELECT :id, :name, :icon
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE id = :id)
"""


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize_schema() -> None:
    logger.info("INFO: Initializing database schema")
    with get_connection() as conn:
        conn.execute(CREATE_SESSIONS_TABLE)
        conn.execute(CREATE_CATEGORIES_TABLE)
        conn.execute(CREATE_EXPENSES_TABLE)
        for category in CATEGORIES:
            conn.execute(INSERT_CATEGORY, category)
    logger.info("INFO: Database schema initialized successfully")
