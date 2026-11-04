// レシート画像の入口検証（旧 backend/services/image_processor.py の validate_file を移植）。
// 前処理（OpenCV）と OCR（pytesseract）は Containers 側に残すため、ここでは扱わない。

import { ALLOWED_IMAGE_TYPES, RECEIPT_IMAGE } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { ApiError } from "../lib/errors";

export function bytesStartWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

/** 検証に通ったファイルのバイト列を返す。違反は 400 の ApiError にする。 */
export async function validateReceiptImage(file: File): Promise<Uint8Array> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new ApiError(400, MESSAGES.UNSUPPORTED_FILE_TYPE);
  }
  if (file.size > RECEIPT_IMAGE.MAX_BYTES) {
    throw new ApiError(400, MESSAGES.FILE_TOO_LARGE);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > RECEIPT_IMAGE.MAX_BYTES) {
    throw new ApiError(400, MESSAGES.FILE_TOO_LARGE);
  }

  const signature = RECEIPT_IMAGE.SIGNATURES[file.type];
  if (signature === undefined || !bytesStartWith(bytes, signature)) {
    throw new ApiError(400, MESSAGES.CONTENT_TYPE_MISMATCH);
  }

  if (file.type === "image/webp") {
    const subtypeStart = RECEIPT_IMAGE.WEBP_SUBTYPE_OFFSET;
    const subtype = String.fromCharCode(...bytes.slice(subtypeStart, subtypeStart + RECEIPT_IMAGE.WEBP_SUBTYPE.length));
    if (subtype !== RECEIPT_IMAGE.WEBP_SUBTYPE) {
      throw new ApiError(400, MESSAGES.CONTENT_TYPE_MISMATCH);
    }
  }

  return bytes;
}
