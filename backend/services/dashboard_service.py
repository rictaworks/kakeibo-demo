import logging

from models.db import get_connection

logger = logging.getLogger(__name__)


class DashboardService:
    def get_monthly_totals(
        self, session_id: str, year: int, month: int
    ) -> list[dict]:
        sql = """
            SELECT
                strftime('%Y', date) AS year,
                strftime('%m', date) AS month,
                SUM(amount) AS total
            FROM expenses
            WHERE session_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
            GROUP BY year, month
        """
        month_str = f"{month:02d}"
        year_str = str(year)
        with get_connection() as conn:
            rows = conn.execute(sql, (session_id, year_str, month_str)).fetchall()
        result = [dict(row) for row in rows]
        logger.debug(
            "DEBUG: get_monthly_totals session=%s year=%d month=%d -> %d rows",
            session_id[:8],
            year,
            month,
            len(result),
        )
        return result

    def get_category_totals(
        self, session_id: str, year: int, month: int
    ) -> list[dict]:
        sql = """
            SELECT
                c.id AS category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                COALESCE(SUM(e.amount), 0) AS total,
                COUNT(e.id) AS count
            FROM categories c
            LEFT JOIN expenses e
              ON c.id = e.category_id
              AND e.session_id = ?
              AND strftime('%Y', e.date) = ?
              AND strftime('%m', e.date) = ?
            GROUP BY c.id, c.name, c.icon
            ORDER BY total DESC
        """
        month_str = f"{month:02d}"
        year_str = str(year)
        with get_connection() as conn:
            rows = conn.execute(sql, (session_id, year_str, month_str)).fetchall()
        result = [dict(row) for row in rows]
        logger.debug(
            "DEBUG: get_category_totals session=%s year=%d month=%d -> %d categories",
            session_id[:8],
            year,
            month,
            len(result),
        )
        return result

    def get_daily_series(
        self, session_id: str, year: int, month: int
    ) -> list[dict]:
        sql = """
            SELECT
                date,
                SUM(amount) AS total
            FROM expenses
            WHERE session_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
            GROUP BY date
            ORDER BY date ASC
        """
        month_str = f"{month:02d}"
        year_str = str(year)
        with get_connection() as conn:
            rows = conn.execute(sql, (session_id, year_str, month_str)).fetchall()
        result = [dict(row) for row in rows]
        logger.debug(
            "DEBUG: get_daily_series session=%s year=%d month=%d -> %d days",
            session_id[:8],
            year,
            month,
            len(result),
        )
        return result
