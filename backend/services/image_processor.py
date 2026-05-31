import logging
from typing import Tuple

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile
from PIL import Image
import io

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB

ALLOWED_MIME_TYPES: frozenset = frozenset(["image/jpeg", "image/png", "image/webp"])

MAGIC_BYTES: dict[str, bytes] = {
    "image/jpeg": bytes([0xFF, 0xD8, 0xFF]),
    "image/png": bytes([0x89, 0x50, 0x4E, 0x47]),
    # WebP は RIFF コンテナ。先頭4バイトが RIFF、バイト8〜11が WEBP のサブタイプ識別子
    "image/webp": bytes([0x52, 0x49, 0x46, 0x46]),
}
WEBP_SUBTYPE_OFFSET: int = 8
WEBP_SUBTYPE_MAGIC: bytes = b"WEBP"


class ImageProcessor:
    def validate_file(self, file: UploadFile) -> bytes:
        if file.content_type not in ALLOWED_MIME_TYPES:
            logger.warning("WARN: Unsupported content type: %s", file.content_type)
            raise HTTPException(
                status_code=400,
                detail=f"対応していないファイル形式です: {file.content_type}",
            )

        image_bytes: bytes = file.file.read()

        if len(image_bytes) > MAX_FILE_SIZE_BYTES:
            logger.warning("WARN: File size exceeded: %d bytes", len(image_bytes))
            raise HTTPException(
                status_code=400,
                detail="ファイルサイズは5MB以下にしてください",
            )

        magic: bytes = MAGIC_BYTES.get(file.content_type, b"")
        if not image_bytes[: len(magic)] == magic:
            logger.warning(
                "WARN: Magic bytes mismatch for content type: %s", file.content_type
            )
            raise HTTPException(
                status_code=400,
                detail="ファイルの内容がcontent-typeと一致しません",
            )

        # WebP は RIFF コンテナ共通ヘッダーを持つため、サブタイプ識別子を追加チェック
        if file.content_type == "image/webp":
            subtype = image_bytes[WEBP_SUBTYPE_OFFSET: WEBP_SUBTYPE_OFFSET + 4]
            if subtype != WEBP_SUBTYPE_MAGIC:
                logger.warning("WARN: WEBP subtype magic mismatch: %r", subtype)
                raise HTTPException(
                    status_code=400,
                    detail="ファイルの内容がcontent-typeと一致しません",
                )

        logger.debug("DEBUG: File validated: size=%d bytes", len(image_bytes))
        return image_bytes

    def preprocess(self, image_bytes: bytes) -> np.ndarray:
        try:
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as exc:
            logger.warning("WARN: PIL failed to open image: %s", exc)
            raise HTTPException(
                status_code=400,
                detail="画像ファイルの読み込みに失敗しました",
            ) from exc
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2,
        )
        corrected = self.correct_skew(binary)
        logger.debug("DEBUG: Image preprocessed: shape=%s", corrected.shape)
        return corrected

    def correct_skew(self, image: np.ndarray) -> np.ndarray:
        edges = cv2.Canny(image, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=100,
            minLineLength=100,
            maxLineGap=10,
        )

        if lines is None:
            logger.debug("DEBUG: No lines detected for skew correction")
            return image

        angles: list[float] = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 == 0:
                continue
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            # Only consider near-horizontal lines for skew detection
            if abs(angle) < 45:
                angles.append(angle)

        if not angles:
            return image

        median_angle = float(np.median(angles))
        if abs(median_angle) < 0.5:
            return image

        h, w = image.shape[:2]
        center: Tuple[float, float] = (w / 2.0, h / 2.0)
        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            image,
            rotation_matrix,
            (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )
        logger.debug("DEBUG: Skew corrected by %.2f degrees", median_angle)
        return rotated
