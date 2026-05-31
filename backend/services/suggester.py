import logging
from datetime import date

from models.db import get_connection

logger = logging.getLogger(__name__)

MAX_SUGGESTIONS: int = 3

CATEGORY_ID_DINING: int = 2
CATEGORY_ID_GROCERIES: int = 1

DINING_THRESHOLD_AMOUNT: int = 30000
CONVENIENCE_STORE_NAMES: frozenset = frozenset([
    "セブンイレブン", "ローソン", "ファミリーマート", "ミニストップ",
    "デイリーヤマザキ", "ポプラ", "スリーエフ",
])
CONVENIENCE_WEEKLY_THRESHOLD: int = 3
MONTHLY_INCREASE_RATIO: float = 0.20
BUDGET_PACE_MONTHLY_BASE: int = 30000
BUDGET_PACE_DAY: int = 15
BUDGET_PACE_RATIO: float = 0.60
CATEGORY_DOMINANT_RATIO: float = 0.40


class SavingsSuggester:
    def suggest(self, session_id: str, year: int, month: int) -> list[dict]:
        suggestions: list[dict] = []

        rules = [
            self._rule_dining,
            self._rule_frequency,
            self._rule_monthly_diff,
            self._rule_budget_pace,
            self._rule_category_ratio,
        ]

        for rule in rules:
            if len(suggestions) >= MAX_SUGGESTIONS:
                break
            try:
                result = rule(session_id, year, month)
                if result:
                    suggestions.append(result)
            except Exception as exc:
                logger.error("ERROR: Suggestion rule %s failed: %s", rule.__name__, exc)

        logger.info(
            "INFO: suggest session=%s year=%d month=%d -> %d suggestions",
            session_id[:8],
            year,
            month,
            len(suggestions),
        )
        return suggestions[:MAX_SUGGESTIONS]

    def _rule_dining(
        self, session_id: str, year: int, month: int
    ) -> dict | None:
        sql = """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE session_id = ?
              AND category_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
        """
        with get_connection() as conn:
            row = conn.execute(
                sql,
                (session_id, CATEGORY_ID_DINING, str(year), f"{month:02d}"),
            ).fetchone()

        total: int = row["total"] if row else 0
        if total >= DINING_THRESHOLD_AMOUNT:
            logger.debug(
                "DEBUG: _rule_dining triggered: total=%d >= %d",
                total,
                DINING_THRESHOLD_AMOUNT,
            )
            return {
                "rule": "dining",
                "message": f"今月の外食費が{total:,}円です。自炊を増やすと節約できます。",
                "amount": total,
            }
        return None

    def _rule_frequency(
        self, session_id: str, year: int, month: int
    ) -> dict | None:
        sql = """
            SELECT date, store_name
            FROM expenses
            WHERE session_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
              AND store_name IS NOT NULL
        """
        with get_connection() as conn:
            rows = conn.execute(
                sql, (session_id, str(year), f"{month:02d}")
            ).fetchall()

        weekly_count: dict[int, int] = {}
        for row in rows:
            store: str = row["store_name"] or ""
            is_convenience = any(name in store for name in CONVENIENCE_STORE_NAMES)
            if not is_convenience:
                continue
            try:
                day = date.fromisoformat(row["date"]).isocalendar()[1]
                weekly_count[day] = weekly_count.get(day, 0) + 1
            except (ValueError, TypeError):
                continue

        max_weekly = max(weekly_count.values(), default=0)
        if max_weekly >= CONVENIENCE_WEEKLY_THRESHOLD:
            logger.debug(
                "DEBUG: _rule_frequency triggered: max_weekly=%d >= %d",
                max_weekly,
                CONVENIENCE_WEEKLY_THRESHOLD,
            )
            return {
                "rule": "frequency",
                "message": f"コンビニを週{max_weekly}回以上利用しています。まとめ買いで節約できます。",
                "count": max_weekly,
            }
        return None

    def _rule_monthly_diff(
        self, session_id: str, year: int, month: int
    ) -> dict | None:
        prev_month = month - 1
        prev_year = year
        if prev_month == 0:
            prev_month = 12
            prev_year -= 1

        sql = """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE session_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
        """
        with get_connection() as conn:
            curr_row = conn.execute(
                sql, (session_id, str(year), f"{month:02d}")
            ).fetchone()
            prev_row = conn.execute(
                sql, (session_id, str(prev_year), f"{prev_month:02d}")
            ).fetchone()

        curr_total: int = curr_row["total"] if curr_row else 0
        prev_total: int = prev_row["total"] if prev_row else 0

        if prev_total == 0:
            return None

        increase_ratio = (curr_total - prev_total) / prev_total
        if increase_ratio >= MONTHLY_INCREASE_RATIO:
            pct = int(increase_ratio * 100)
            logger.debug(
                "DEBUG: _rule_monthly_diff triggered: ratio=%.2f >= %.2f",
                increase_ratio,
                MONTHLY_INCREASE_RATIO,
            )
            return {
                "rule": "monthly_diff",
                "message": f"先月と比べて支出が{pct}%増加しています。支出を見直しましょう。",
                "ratio": increase_ratio,
            }
        return None

    def _rule_budget_pace(
        self, session_id: str, year: int, month: int
    ) -> dict | None:
        today = date.today()
        # Only apply this rule if we're past BUDGET_PACE_DAY
        if today.year != year or today.month != month or today.day < BUDGET_PACE_DAY:
            return None

        threshold = int(BUDGET_PACE_MONTHLY_BASE * BUDGET_PACE_RATIO)
        sql = """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE session_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
              AND date <= ?
        """
        mid_date = date(year, month, BUDGET_PACE_DAY).isoformat()
        with get_connection() as conn:
            row = conn.execute(
                sql, (session_id, str(year), f"{month:02d}", mid_date)
            ).fetchone()

        total: int = row["total"] if row else 0
        if total > threshold:
            logger.debug(
                "DEBUG: _rule_budget_pace triggered: total=%d > threshold=%d",
                total,
                threshold,
            )
            return {
                "rule": "budget_pace",
                "message": (
                    f"月の前半で{total:,}円使っています。"
                    f"このペースでは月{BUDGET_PACE_MONTHLY_BASE:,}円を超える可能性があります。"
                ),
                "amount": total,
            }
        return None

    def _rule_category_ratio(
        self, session_id: str, year: int, month: int
    ) -> dict | None:
        sql_total = """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE session_id = ?
              AND strftime('%Y', date) = ?
              AND strftime('%m', date) = ?
        """
        sql_by_cat = """
            SELECT
                c.name AS category_name,
                COALESCE(SUM(e.amount), 0) AS total
            FROM categories c
            LEFT JOIN expenses e
              ON c.id = e.category_id
              AND e.session_id = ?
              AND strftime('%Y', e.date) = ?
              AND strftime('%m', e.date) = ?
            GROUP BY c.id, c.name
            ORDER BY total DESC
            LIMIT 1
        """
        with get_connection() as conn:
            total_row = conn.execute(
                sql_total, (session_id, str(year), f"{month:02d}")
            ).fetchone()
            cat_row = conn.execute(
                sql_by_cat, (session_id, str(year), f"{month:02d}")
            ).fetchone()

        grand_total: int = total_row["total"] if total_row else 0
        if grand_total == 0 or cat_row is None:
            return None

        cat_total: int = cat_row["total"]
        cat_name: str = cat_row["category_name"]
        ratio = cat_total / grand_total

        if ratio >= CATEGORY_DOMINANT_RATIO:
            pct = int(ratio * 100)
            logger.debug(
                "DEBUG: _rule_category_ratio triggered: category=%s ratio=%.2f",
                cat_name,
                ratio,
            )
            return {
                "rule": "category_ratio",
                "message": (
                    f"「{cat_name}」が全体の{pct}%を占めています。"
                    "バランスよく支出を管理しましょう。"
                ),
                "category_name": cat_name,
                "ratio": ratio,
            }
        return None
