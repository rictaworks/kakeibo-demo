import hashlib
import uuid

import pytest
from services.session import SessionManager, SESSION_COOKIE_NAME, SESSION_EXPIRES_HOURS


class TestHashSessionId:
    def test_sha256_hash_length(self) -> None:
        manager = SessionManager()
        raw_id = str(uuid.uuid4())
        hashed = manager.hash_session_id(raw_id)
        assert len(hashed) == 64  # SHA-256 hex digest = 64 chars

    def test_sha256_hash_consistency(self) -> None:
        manager = SessionManager()
        raw_id = str(uuid.uuid4())
        assert manager.hash_session_id(raw_id) == manager.hash_session_id(raw_id)

    def test_sha256_hash_uniqueness(self) -> None:
        manager = SessionManager()
        id1 = str(uuid.uuid4())
        id2 = str(uuid.uuid4())
        assert manager.hash_session_id(id1) != manager.hash_session_id(id2)

    def test_sha256_hash_matches_stdlib(self) -> None:
        manager = SessionManager()
        raw_id = "test-session-id"
        expected = hashlib.sha256(raw_id.encode("utf-8")).hexdigest()
        assert manager.hash_session_id(raw_id) == expected


class TestConstants:
    def test_cookie_name_is_string(self) -> None:
        assert isinstance(SESSION_COOKIE_NAME, str)
        assert len(SESSION_COOKIE_NAME) > 0

    def test_expire_hours_is_positive_int(self) -> None:
        assert isinstance(SESSION_EXPIRES_HOURS, int)
        assert SESSION_EXPIRES_HOURS > 0
