# API仕様 - レシートアップロード (Receipts)

Base URL: `http://localhost:8000`

---

## POST /api/receipts/upload

レシート画像をOCR処理してテキスト抽出・自動分類を行う。
画像はサーバーに保存しない（OCR処理後即時破棄）。

**リクエスト**

- Content-Type: `multipart/form-data`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `image` | File | yes | JPEG / PNG / WebP（最大5MB） |
| `honeypot` | string | yes | ボット対策フィールド（空文字を送ること） |

**バリデーション**

- MIMEタイプ: `image/jpeg` / `image/png` / `image/webp` のみ
- マジックバイト検証（JPEG: `FF D8 FF`、PNG: `89 50 4E 47`、WebP: `52 49 46 46` + サブタイプ `WEBP`）
- ファイルサイズ: 5MB以下
- ハニーポット: `honeypot` フィールドが空でない場合は `400` を返す

**OCRタイムアウト**

- 最大10秒。タイムアウト時は `needs_manual: true` を返す

**レスポンス (200)**

```json
{
  "ocr_result": {
    "text": "イオン\n2026年5月31日\n牛乳  ¥200\n合計  ¥1,200",
    "amount": 1200,
    "date": "2026-05-31",
    "store_name": "イオン",
    "items": [
      { "name": "牛乳", "amount": 200 }
    ]
  },
  "classification": {
    "category_id": 1,
    "category_name": "食料品",
    "confidence": "high"
  },
  "needs_manual": false
}
```

**confidence（信頼度）の値**

| 値 | 分類根拠 |
|---|---|
| `"high"` | 店舗名マスタ一致（約120件） |
| `"medium"` | 商品キーワードマスタ一致（約200件） |
| `"low"` | 金額帯ルール |
| `null` | 分類不能（その他カテゴリ） |

**needs_manual が true になる条件**

- `confidence` が `"low"` または `null`
- OCRタイムアウト

**エラー**

| ステータス | 説明 |
|---|---|
| `400` | ファイル形式・サイズ不正 / ハニーポット検出 |
| `503` | DBリセット中 |
