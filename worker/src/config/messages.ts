// API が返すユーザー向けメッセージ（日本語）。ハンドラやサービスに直接書かない。
// 旧 backend の FastAPI 実装が返していた detail 文言を引き継ぐ。

export const MESSAGES = {
  EXPENSE_NOT_FOUND: "支出が見つかりません",
  UPDATE_FIELDS_MISSING: "更新フィールドが指定されていません",
  INVALID_JSON_BODY: "リクエストボディはJSONオブジェクトで送信してください",
  NOT_FOUND: "リソースが見つかりません",
  INTERNAL_ERROR: "内部エラーが発生しました",
  SESSION_RATE_LIMITED: "セッションの発行回数が上限に達しました。しばらくしてから再度お試しください",

  FIELD_REQUIRED: "必須項目です",
  FIELD_MUST_BE_TEXT: "文字列で指定してください",
  FIELD_MUST_BE_INTEGER: "整数で指定してください",
  DATE_FORMAT: "日付はYYYY-MM-DD形式で入力してください",
  AMOUNT_RANGE: "金額は1円以上1,000万円以下の整数で入力してください",
  CATEGORY_RANGE: "カテゴリは1〜8の整数で指定してください",
  STORE_NAME_TOO_LONG: "店舗名は100文字以内で入力してください",
  MEMO_TOO_LONG: "メモは500文字以内で入力してください",

  MONTH_RANGE: "monthは1〜12の範囲で指定してください",
  YEAR_RANGE: "yearが不正です",

  HONEYPOT_DETECTED: "不正なリクエストです",
  IMAGE_REQUIRED: "画像ファイルを指定してください",
  UNSUPPORTED_FILE_TYPE: "対応していないファイル形式です",
  FILE_TOO_LARGE: "ファイルサイズは5MB以下にしてください",
  CONTENT_TYPE_MISMATCH: "ファイルの内容がcontent-typeと一致しません",
  OCR_NOT_AVAILABLE:
    "レシートの読み取り（OCR）はこのAPIでは未移行です。OCR処理がContainersで接続されるまでお待ちください",

  SUGGESTION_DINING: "今月の外食費が{amount}円です。自炊を増やすと節約できます。",
  SUGGESTION_FREQUENCY: "コンビニを週{count}回以上利用しています。まとめ買いで節約できます。",
  SUGGESTION_MONTHLY_DIFF: "先月と比べて支出が{percent}%増加しています。支出を見直しましょう。",
  SUGGESTION_BUDGET_PACE:
    "月の前半で{amount}円使っています。このペースでは月{monthlyBase}円を超える可能性があります。",
  SUGGESTION_CATEGORY_RATIO: "「{category}」が全体の{percent}%を占めています。バランスよく支出を管理しましょう。",
} as const;
