import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models.db import initialize_schema
from routers import receipts, expenses, dashboard
from scheduler import DbResetScheduler, is_resetting

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", "https://kakeibo-demo.vercel.app"),
]

_scheduler = DbResetScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("INFO: Application startup")
    initialize_schema()
    _scheduler.schedule_daily_reset()
    yield
    logger.info("INFO: Application shutdown")
    _scheduler.shutdown()


app = FastAPI(
    title="kakeibo-demo API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Cookie"],
)


@app.middleware("http")
async def resetting_middleware(request: Request, call_next):
    if is_resetting() and not request.url.path.startswith("/docs"):
        return JSONResponse(
            status_code=503,
            content={"detail": "メンテナンス中です。しばらくお待ちください。"},
        )
    return await call_next(request)


app.include_router(receipts.router)
app.include_router(expenses.router)
app.include_router(dashboard.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
