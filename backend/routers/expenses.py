import logging
from datetime import date, datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from models.db import get_connection
from services.session import SessionManager
from scheduler import is_resetting

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/expenses", tags=["expenses"])

_session_manager = SessionManager()

VALID_CATEGORY_IDS: frozenset = frozenset(range(1, 9))


class ExpenseInput(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    amount: int = Field(..., gt=0, description="円単位の金額")
    category_id: int = Field(..., ge=1, le=8)
    store_name: Optional[str] = Field(None, max_length=100)
    memo: Optional[str] = Field(None, max_length=500)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("日付はYYYY-MM-DD形式で入力してください") from exc
        return v


class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    amount: Optional[int] = Field(None, gt=0)
    category_id: Optional[int] = Field(None, ge=1, le=8)
    store_name: Optional[str] = Field(None, max_length=100)
    memo: Optional[str] = Field(None, max_length=500)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("日付はYYYY-MM-DD形式で入力してください") from exc
        return v


def _get_session(request: Request, response: Response) -> str:
    try:
        return _session_manager.validate_session(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return _session_manager.create_session(response)
        raise


@router.post("")
def create_expense(
    body: ExpenseInput, request: Request, response: Response
) -> dict[str, Any]:
    if is_resetting():
        raise HTTPException(status_code=503, detail="メンテナンス中です")

    session_id = _get_session(request, response)
    now = datetime.now(tz=timezone.utc).isoformat()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO expenses (session_id, category_id, date, amount, store_name, memo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, body.category_id, body.date, body.amount,
             body.store_name, body.memo, now, now),
        )
        expense_id = cursor.lastrowid

    logger.info("INFO: Expense created id=%d session=%s", expense_id, session_id[:8])
    return {"id": expense_id, "created_at": now}


@router.get("")
def list_expenses(request: Request, response: Response) -> list[dict[str, Any]]:
    session_id = _get_session(request, response)

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT e.*, c.name AS category_name, c.icon AS category_icon
            FROM expenses e
            JOIN categories c ON e.category_id = c.id
            WHERE e.session_id = ?
            ORDER BY e.date DESC, e.created_at DESC
            """,
            (session_id,),
        ).fetchall()

    return [dict(row) for row in rows]


@router.put("/{expense_id}")
def update_expense(
    expense_id: int, body: ExpenseUpdate, request: Request, response: Response
) -> dict[str, Any]:
    if is_resetting():
        raise HTTPException(status_code=503, detail="メンテナンス中です")

    session_id = _get_session(request, response)

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM expenses WHERE id = ? AND session_id = ?",
            (expense_id, session_id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="支出が見つかりません")

        fields = body.model_dump(exclude_none=True)
        if not fields:
            raise HTTPException(status_code=400, detail="更新フィールドが指定されていません")

        now = datetime.now(tz=timezone.utc).isoformat()
        fields["updated_at"] = now

        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [expense_id, session_id]
        conn.execute(
            f"UPDATE expenses SET {set_clause} WHERE id = ? AND session_id = ?",
            values,
        )

    logger.info("INFO: Expense updated id=%d session=%s", expense_id, session_id[:8])
    return {"id": expense_id, "updated": True}


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int, request: Request, response: Response
) -> dict[str, Any]:
    if is_resetting():
        raise HTTPException(status_code=503, detail="メンテナンス中です")

    session_id = _get_session(request, response)

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM expenses WHERE id = ? AND session_id = ?",
            (expense_id, session_id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="支出が見つかりません")

        conn.execute(
            "DELETE FROM expenses WHERE id = ? AND session_id = ?",
            (expense_id, session_id),
        )

    logger.info("INFO: Expense deleted id=%d session=%s", expense_id, session_id[:8])
    return {"id": expense_id, "deleted": True}
