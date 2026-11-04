// 数値・識別子の設定値（文字列リテラルの設定ファイル分離ルール: CLAUDE.md「コーディング規約」）

export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  TEST: "test",
  PRODUCTION: "production",
} as const;

export const LOG_LEVELS = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
} as const;

export const SESSION = {
  COOKIE_NAME: "session_id",
  EXPIRES_HOURS: 24,
  MAX_AGE_SECONDS: 24 * 60 * 60,
} as const;

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Cookie なしのリクエストで発行するセッションの回数制限（固定ウィンドウ・クライアント IP 単位）。 */
export const SESSION_ISSUANCE = {
  WINDOW_SECONDS: 10 * 60,
  MAX_PER_WINDOW: 30,
  // Cloudflare が付与する接続元 IP。ローカル開発などヘッダが無い場合は共通のバケットにまとめる。
  CLIENT_IP_HEADER: "CF-Connecting-IP",
  UNKNOWN_CLIENT: "unknown",
} as const;

export const EXPENSE_LIMITS = {
  AMOUNT_MIN: 1,
  // 1 件あたりの上限（1,000 万円）。合計の上限ではなく入力値の上限。
  AMOUNT_MAX: 10_000_000,
  CATEGORY_ID_MIN: 1,
  CATEGORY_ID_MAX: 8,
  STORE_NAME_MAX_LENGTH: 100,
  MEMO_MAX_LENGTH: 500,
} as const;

export const DASHBOARD_LIMITS = {
  YEAR_MIN: 2000,
  YEAR_MAX: 2100,
  MONTH_MIN: 1,
  MONTH_MAX: 12,
} as const;

export const RECEIPT_IMAGE = {
  MAX_BYTES: 5 * 1024 * 1024,
  // multipart の区切りやフィールド名のための余白。これを超える Content-Length は本文を読まずに拒否する。
  MULTIPART_OVERHEAD_BYTES: 64 * 1024,
  MULTIPART_CONTENT_TYPE: "multipart/form-data",
  WEBP_SUBTYPE_OFFSET: 8,
  WEBP_SUBTYPE: "WEBP",
  // 先頭バイト列（マジックバイト）。WebP は RIFF コンテナのためサブタイプを別途確認する。
  SIGNATURES: {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
  } as Readonly<Record<string, readonly number[]>>,
} as const;

export const ALLOWED_IMAGE_TYPES: readonly string[] = Object.keys(RECEIPT_IMAGE.SIGNATURES);
