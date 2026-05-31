import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response

from services.dashboard_service import DashboardService
from services.session import SessionManager
from scheduler import is_resetting

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_session_manager = SessionManager()
_dashboard_service = DashboardService()


def _get_or_create_session(request: Request, response: Response) -> str:
    try:
        return _session_manager.validate_session(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return _session_manager.create_session(response)
        raise


@router.get("")
def get_dashboard(
    request: Request,
    response: Response,
    year: int = Query(default=None),
    month: int = Query(default=None),
) -> dict[str, Any]:
    if is_resetting():
        raise HTTPException(status_code=503, detail="メンテナンス中です")

    session_id = _get_or_create_session(request, response)

    now = datetime.now(tz=timezone.utc)
    target_year = year if year is not None else now.year
    target_month = month if month is not None else now.month

    if not (1 <= target_month <= 12):
        raise HTTPException(status_code=400, detail="monthは1〜12の範囲で指定してください")
    if target_year < 2000 or target_year > 2100:
        raise HTTPException(status_code=400, detail="yearが不正です")

    from services.suggester import SavingsSuggester
    suggester = SavingsSuggester()

    monthly_totals = _dashboard_service.get_monthly_totals(session_id, target_year, target_month)
    category_totals = _dashboard_service.get_category_totals(session_id, target_year, target_month)
    daily_series = _dashboard_service.get_daily_series(session_id, target_year, target_month)
    suggestions = suggester.suggest(session_id, target_year, target_month)

    logger.info(
        "INFO: Dashboard fetched session=%s year=%d month=%d",
        session_id[:8], target_year, target_month,
    )

    return {
        "monthly_totals": monthly_totals,
        "category_totals": category_totals,
        "daily_series": daily_series,
        "suggestions": suggestions,
    }
