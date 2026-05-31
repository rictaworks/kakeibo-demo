import logging
import os
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from models.db import get_connection

logger = logging.getLogger(__name__)

LOCK_FILE: str = "backend/db/resetting.lock"
JST = timezone(timedelta(hours=9))


class DbResetScheduler:
    def __init__(self) -> None:
        self._scheduler = BackgroundScheduler(timezone="Asia/Tokyo")

    def schedule_daily_reset(self) -> None:
        self._scheduler.add_job(
            self.run_reset,
            trigger=CronTrigger(hour=3, minute=0, timezone="Asia/Tokyo"),
            id="daily_db_reset",
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info("INFO: Daily DB reset scheduled at JST 03:00")

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("INFO: Scheduler shutdown")

    def run_reset(self) -> None:
        if not self._acquire_lock():
            logger.warning("WARN: DB reset already in progress, skipping")
            return

        logger.info("INFO: Starting DB reset at %s", datetime.now(JST).isoformat())
        try:
            with get_connection() as conn:
                conn.execute("DELETE FROM expenses")
                conn.execute("DELETE FROM sessions")
                conn.execute("VACUUM")
            logger.info("INFO: DB reset completed successfully")
        except Exception as exc:
            logger.error("ERROR: DB reset failed: %s", exc)
            raise
        finally:
            self._release_lock()

    def _acquire_lock(self) -> bool:
        os.makedirs(os.path.dirname(LOCK_FILE), exist_ok=True)
        if os.path.exists(LOCK_FILE):
            return False
        try:
            with open(LOCK_FILE, "w") as f:
                f.write(datetime.now(JST).isoformat())
            return True
        except OSError as exc:
            logger.error("ERROR: Failed to acquire reset lock: %s", exc)
            return False

    def _release_lock(self) -> None:
        try:
            if os.path.exists(LOCK_FILE):
                os.remove(LOCK_FILE)
        except OSError as exc:
            logger.error("ERROR: Failed to release reset lock: %s", exc)


def is_resetting() -> bool:
    return os.path.exists(LOCK_FILE)
