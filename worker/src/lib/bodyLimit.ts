import { MESSAGES } from "../config/messages";
import { ApiError } from "./errors";

/**
 * リクエスト本文を上限まで逐次読む。受信したバイト数を読みながら数え、上限を超えた時点で
 * 読み取りを打ち切って 400 にする（宣言された Content-Length は信用せず、実際に届いた量で判定する）。
 */
export async function readBodyWithLimit(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (request.body === null) {
    return new Uint8Array(0);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new ApiError(400, MESSAGES.FILE_TOO_LARGE);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
