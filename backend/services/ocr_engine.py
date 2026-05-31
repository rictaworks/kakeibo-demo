import logging
import re
import signal
from datetime import date
from typing import Optional

import numpy as np
import pytesseract

logger = logging.getLogger(__name__)

OCR_LANG: str = "jpn+eng"
OCR_TIMEOUT_SECONDS: int = 10

AMOUNT_PATTERNS: list[str] = [
    r"合計[^\d]*(\d[\d,]+)",
    r"小計[^\d]*(\d[\d,]+)",
    r"[Tt]otal[^\d]*(\d[\d,]+)",
    r"お支払[^\d]*(\d[\d,]+)",
    r"¥\s*(\d[\d,]+)",
    r"￥\s*(\d[\d,]+)",
    r"(\d[\d,]+)\s*円",
]

DATE_PATTERNS: list[tuple[str, str]] = [
    (r"(\d{4})[年/\-](\d{1,2})[月/\-](\d{1,2})日?", "ymd"),
    (r"(\d{2})[年/\-](\d{1,2})[月/\-](\d{1,2})日?", "short_ymd"),
    (r"令和(\d+)年(\d{1,2})月(\d{1,2})日", "reiwa"),
    (r"平成(\d+)年(\d{1,2})月(\d{1,2})日", "heisei"),
]

STORE_NAME_MAX_LINES: int = 5


class _TimeoutError(Exception):
    pass


class OcrEngine:
    def extract_text(self, image: np.ndarray) -> str:
        def _handler(signum: int, frame: object) -> None:
            raise _TimeoutError("OCR timed out")

        signal.signal(signal.SIGALRM, _handler)
        signal.alarm(OCR_TIMEOUT_SECONDS)
        try:
            text: str = pytesseract.image_to_string(image, lang=OCR_LANG)
            logger.debug("DEBUG: OCR extracted %d characters", len(text))
            return text
        except _TimeoutError:
            logger.error("ERROR: OCR timed out after %d seconds", OCR_TIMEOUT_SECONDS)
            raise
        except Exception as exc:
            logger.error("ERROR: OCR failed: %s", exc)
            raise
        finally:
            signal.alarm(0)

    def parse_amount(self, text: str) -> Optional[int]:
        for pattern in AMOUNT_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                raw = matches[-1].replace(",", "").replace("，", "")
                try:
                    amount = int(raw)
                    if amount > 0:
                        logger.debug("DEBUG: Parsed amount=%d", amount)
                        return amount
                except ValueError:
                    continue
        logger.debug("DEBUG: No amount found in OCR text")
        return None

    def parse_date(self, text: str) -> Optional[date]:
        for pattern, fmt in DATE_PATTERNS:
            match = re.search(pattern, text)
            if match:
                try:
                    if fmt == "ymd":
                        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                    elif fmt == "short_ymd":
                        year = 2000 + int(match.group(1))
                        month, day = int(match.group(2)), int(match.group(3))
                    elif fmt == "reiwa":
                        year = 2018 + int(match.group(1))
                        month, day = int(match.group(2)), int(match.group(3))
                    elif fmt == "heisei":
                        year = 1988 + int(match.group(1))
                        month, day = int(match.group(2)), int(match.group(3))
                    else:
                        continue
                    parsed = date(year, month, day)
                    logger.debug("DEBUG: Parsed date=%s", parsed)
                    return parsed
                except (ValueError, OverflowError):
                    continue
        logger.debug("DEBUG: No date found in OCR text")
        return None

    def parse_store(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        candidates = lines[:STORE_NAME_MAX_LINES]

        for line in candidates:
            # Skip lines that look like addresses, phone numbers, or amounts
            if re.search(r"\d{3}-\d{4}", line):
                continue
            if re.search(r"[¥￥]\d", line):
                continue
            if re.search(r"^\d+$", line):
                continue
            if len(line) >= 2:
                logger.debug("DEBUG: Parsed store name: %s", line)
                return line

        logger.debug("DEBUG: No store name found in OCR text")
        return None

    def parse_items(self, text: str) -> list[dict]:
        items: list[dict] = []
        # Pattern: item name followed by price on same line
        pattern = re.compile(r"(.+?)\s+[¥￥]?\s*(\d[\d,]+)\s*$")
        for line in text.splitlines():
            line = line.strip()
            match = pattern.match(line)
            if match:
                name = match.group(1).strip()
                raw_price = match.group(2).replace(",", "")
                try:
                    price = int(raw_price)
                    if name and price > 0:
                        items.append({"name": name, "amount": price})
                except ValueError:
                    continue
        logger.debug("DEBUG: Parsed %d items from OCR text", len(items))
        return items
