import logging
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile

from models.db import get_connection
from services.classifier import RuleClassifier
from services.image_processor import ImageProcessor
from services.ocr_engine import OcrEngine
from services.session import SessionManager
from scheduler import is_resetting

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/receipts", tags=["receipts"])

_session_manager = SessionManager()
_image_processor = ImageProcessor()
_ocr_engine = OcrEngine()
_classifier = RuleClassifier()

HONEYPOT_FIELD_NAME: str = "honeypot"
CATEGORY_NAMES: dict[int, str] = {
    1: "食料品", 2: "外食", 3: "交通", 4: "医療・健康",
    5: "衣類・美容", 6: "日用品", 7: "娯楽", 8: "その他",
}
LOW_CONFIDENCE_VALUES: frozenset = frozenset([None, "low"])


def _get_or_create_session(request: Request, response: Response) -> str:
    try:
        return _session_manager.validate_session(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return _session_manager.create_session(response)
        raise


@router.post("/upload")
async def upload_receipt(
    request: Request,
    response: Response,
    image: UploadFile = File(...),
    honeypot: str = Form(default=""),
) -> dict[str, Any]:
    if honeypot:
        logger.warning("WARN: Honeypot triggered from %s", request.client)
        raise HTTPException(status_code=400, detail="不正なリクエストです")

    if is_resetting():
        raise HTTPException(status_code=503, detail="メンテナンス中です。しばらくお待ちください。")

    session_id = _get_or_create_session(request, response)

    image_bytes = _image_processor.validate_file(image)
    preprocessed = _image_processor.preprocess(image_bytes)

    try:
        raw_text = _ocr_engine.extract_text(preprocessed)
    except TimeoutError:
        logger.warning("WARN: OCR timeout for session=%s", session_id[:8])
        return {
            "ocr_result": {"text": "", "amount": None, "date": None, "store_name": None, "items": []},
            "classification": {"category_id": 8, "category_name": "その他", "confidence": None},
            "needs_manual": True,
        }

    amount = _ocr_engine.parse_amount(raw_text)
    parsed_date = _ocr_engine.parse_date(raw_text)
    store_name = _ocr_engine.parse_store(raw_text)
    items = _ocr_engine.parse_items(raw_text)

    classification = _classifier.classify(store_name, items, amount)
    cat_id: int = classification["category_id"]
    confidence = classification.get("confidence")

    needs_manual = confidence in LOW_CONFIDENCE_VALUES

    logger.info(
        "INFO: upload_receipt session=%s cat_id=%d confidence=%s needs_manual=%s",
        session_id[:8], cat_id, confidence, needs_manual,
    )

    return {
        "ocr_result": {
            "text": raw_text,
            "amount": amount,
            "date": parsed_date.isoformat() if parsed_date else None,
            "store_name": store_name,
            "items": items,
        },
        "classification": {
            "category_id": cat_id,
            "category_name": CATEGORY_NAMES.get(cat_id, "その他"),
            "confidence": confidence,
        },
        "needs_manual": needs_manual,
    }
