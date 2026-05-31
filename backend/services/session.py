import hashlib
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response

from models.db import get_connection

logger = logging.getLogger(__name__)

SESSION_COOKIE_NAME: str = "session_id"
SESSION_EXPIRES_HOURS: int = 24
SESSION_COOKIE_MAX_AGE: int = SESSION_EXPIRES_HOURS * 3600
# 本番環境ではCookieをHTTPS専用にする（MitMによるセッション盗取対策）
SESSION_COOKIE_SECURE: bool = os.getenv("ENV", "development") == "production"


class SessionManager:
    @staticmethod
    def hash_session_id(raw_id: str) -> str:
        return hashlib.sha256(raw_id.encode("utf-8")).hexdigest()

    def create_session(self, response: Response) -> str:
        raw_id = str(uuid.uuid4())
        hashed_id = self.hash_session_id(raw_id)
        now = datetime.now(tz=timezone.utc)
        expires_at = now + timedelta(hours=SESSION_EXPIRES_HOURS)

        with get_connection() as conn:
            conn.execute(
                "INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)",
                (hashed_id, now.isoformat(), expires_at.isoformat()),
            )

        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=raw_id,
            httponly=True,
            samesite="lax",
            secure=SESSION_COOKIE_SECURE,
            max_age=SESSION_COOKIE_MAX_AGE,
        )
        logger.info("INFO: New session created (hashed_id=%s)", hashed_id[:8] + "...")
        return hashed_id

    def validate_session(self, request: Request) -> str:
        raw_id = request.cookies.get(SESSION_COOKIE_NAME)
        if not raw_id:
            logger.warning("WARN: Session cookie missing")
            raise HTTPException(status_code=401, detail="セッションが見つかりません")

        hashed_id = self.hash_session_id(raw_id)
        now = datetime.now(tz=timezone.utc)

        with get_connection() as conn:
            row = conn.execute(
                "SELECT id, expires_at FROM sessions WHERE id = ?",
                (hashed_id,),
            ).fetchone()

        if row is None:
            logger.warning("WARN: Session not found in DB (hashed_id=%s)", hashed_id[:8] + "...")
            raise HTTPException(status_code=401, detail="セッションが無効です")

        expires_at_str: str = row["expires_at"]
        expires_at = datetime.fromisoformat(expires_at_str)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            logger.warning("WARN: Session expired (hashed_id=%s)", hashed_id[:8] + "...")
            raise HTTPException(status_code=401, detail="セッションの有効期限が切れています")

        return hashed_id
