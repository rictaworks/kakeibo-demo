import { describe, expect, it } from "vitest";
import { MESSAGES } from "../../src/config/messages";
import { ApiError } from "../../src/lib/errors";
import { validateReceiptImage } from "../../src/services/receiptImage";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

function fileOf(bytes: number[], type: string, extraSize = 0): File {
  const data = new Uint8Array(bytes.length + extraSize);
  data.set(bytes);
  return new File([data], "receipt", { type });
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected ApiError");
}

describe("validateReceiptImage（旧 ImageProcessor.validate_file）", () => {
  it("PNG・JPEG・WebP の正しいシグネチャを受け付ける", async () => {
    expect((await validateReceiptImage(fileOf(PNG_HEADER, "image/png"))).length).toBe(PNG_HEADER.length);
    expect((await validateReceiptImage(fileOf(JPEG_HEADER, "image/jpeg"))).length).toBe(JPEG_HEADER.length);
    expect((await validateReceiptImage(fileOf(WEBP_HEADER, "image/webp"))).length).toBe(WEBP_HEADER.length);
  });

  it("対応していない content-type は 400", async () => {
    const error = await errorOf(validateReceiptImage(fileOf(PNG_HEADER, "image/gif")));
    expect(error.status).toBe(400);
    expect(error.detail).toBe(MESSAGES.UNSUPPORTED_FILE_TYPE);
  });

  it("5MB を超えると 400（境界の 5MB ちょうどは通す）", async () => {
    const fiveMegabytes = 5 * 1024 * 1024;
    const atLimit = await validateReceiptImage(fileOf(PNG_HEADER, "image/png", fiveMegabytes - PNG_HEADER.length));
    expect(atLimit.length).toBe(fiveMegabytes);
    const oversized = await errorOf(validateReceiptImage(fileOf(PNG_HEADER, "image/png", fiveMegabytes)));
    expect(oversized.detail).toBe(MESSAGES.FILE_TOO_LARGE);
  });

  it("中身が content-type と一致しなければ 400", async () => {
    const error = await errorOf(validateReceiptImage(fileOf(JPEG_HEADER, "image/png")));
    expect(error.detail).toBe(MESSAGES.CONTENT_TYPE_MISMATCH);
  });

  it("RIFF だがサブタイプが WEBP でなければ 400", async () => {
    const riffAvi = [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20];
    const error = await errorOf(validateReceiptImage(fileOf(riffAvi, "image/webp")));
    expect(error.detail).toBe(MESSAGES.CONTENT_TYPE_MISMATCH);
  });
});
