import { Hono } from "hono";
import { RECEIPT_IMAGE } from "../config/constants";
import { MESSAGES } from "../config/messages";
import type { AppEnv } from "../env";
import { ApiError, validationError } from "../lib/errors";
import { readBodyWithLimit } from "../lib/bodyLimit";
import { validateReceiptImage } from "../services/receiptImage";
import { sessionMiddleware } from "../session/session";
import { loggerFor } from "./common";

/** 本文全体の上限（画像の上限に multipart の余白を足したもの）。 */
const REQUEST_BYTE_LIMIT = RECEIPT_IMAGE.MAX_BYTES + RECEIPT_IMAGE.MULTIPART_OVERHEAD_BYTES;

/**
 * /api/receipts/upload（旧 backend/routers/receipts.py）。
 * 入口の検証（ハニーポット・形式・サイズ・マジックバイト）は移植済み。
 * OCR（OpenCV 前処理と pytesseract）は Containers 側に残すため、検証後は 501 を返す。
 */
export function createReceiptRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  routes.use("*", sessionMiddleware);

  routes.post("/upload", async (c) => {
    const logger = loggerFor(c, "receipts");

    // 宣言サイズが明らかに大きい場合は本文を読まずに拒否する（早期拒否）
    const declaredLength = Number(c.req.header("Content-Length") ?? "0");
    if (declaredLength > REQUEST_BYTE_LIMIT) {
      logger.warn("declared body size exceeds the limit; request rejected");
      throw new ApiError(400, MESSAGES.FILE_TOO_LARGE);
    }

    const contentType = c.req.header("Content-Type") ?? "";
    if (!contentType.toLowerCase().startsWith(RECEIPT_IMAGE.MULTIPART_CONTENT_TYPE)) {
      throw validationError([{ loc: ["body", "image"], msg: MESSAGES.IMAGE_REQUIRED }]);
    }

    // 本文は受信しながら数え、上限を超えた時点で読み取りを止める（全件を先に読み込まない）
    const body = await readBodyWithLimit(c.req.raw, REQUEST_BYTE_LIMIT);

    let form: FormData;
    try {
      form = await new Request(c.req.url, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body,
      }).formData();
    } catch {
      throw validationError([{ loc: ["body", "image"], msg: MESSAGES.IMAGE_REQUIRED }]);
    }

    const honeypot = form.get("honeypot");
    if (typeof honeypot === "string" && honeypot.length > 0) {
      logger.warn("honeypot field was filled; request rejected");
      throw new ApiError(400, MESSAGES.HONEYPOT_DETECTED);
    }

    const image = form.get("image");
    if (!(image instanceof File)) {
      throw validationError([{ loc: ["body", "image"], msg: MESSAGES.IMAGE_REQUIRED }]);
    }
    await validateReceiptImage(image);

    logger.info("receipt image passed validation; OCR is served by Containers, not this Worker");
    throw new ApiError(501, MESSAGES.OCR_NOT_AVAILABLE);
  });

  return routes;
}
