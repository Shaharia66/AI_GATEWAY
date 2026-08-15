import os
import sqlite3
import time

# Configurable so Docker can point this at a mounted volume (persists across
# container restarts). Falls back to the old local-dev location if unset -
# your existing local setup keeps working exactly as before.
DB_PATH = os.getenv("USAGE_DB_PATH") or os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "usage.db"
)


def init_db() -> None:
    """Creates the requests table if it doesn't already exist. Safe to call every startup."""
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL,
            completion_tokens INTEGER NOT NULL,
            total_tokens INTEGER NOT NULL,
            estimated_cost_usd REAL NOT NULL,
            cache_hit INTEGER NOT NULL,
            fallback_used INTEGER NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def log_request(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    estimated_cost_usd: float,
    cache_hit: bool,
    fallback_used: bool,
) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        INSERT INTO requests
            (timestamp, provider, model, prompt_tokens, completion_tokens,
             total_tokens, estimated_cost_usd, cache_hit, fallback_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            time.time(),
            provider,
            model,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            estimated_cost_usd,
            int(cache_hit),
            int(fallback_used),
        ),
    )
    conn.commit()
    conn.close()


def get_usage_summary() -> list[dict]:
    """Totals grouped by provider - this is what powers the dashboard."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT
            provider,
            COUNT(*) AS request_count,
            SUM(total_tokens) AS total_tokens,
            SUM(estimated_cost_usd) AS total_cost_usd,
            SUM(cache_hit) AS cache_hits,
            SUM(fallback_used) AS fallback_count
        FROM requests
        GROUP BY provider
        ORDER BY request_count DESC
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_recent_requests(limit: int = 20) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM requests ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]