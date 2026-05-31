# API仕様 - 収支 (Transactions)

Base URL: `/api/v1`

全エンドポイントで `Authorization: Bearer {JWT}` ヘッダーが必要。

---

## GET /transactions

収支一覧取得。

**クエリパラメータ**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| year | integer | no | 年 (例: 2026) |
| month | integer | no | 月 (例: 5) |
| category_id | integer | no | カテゴリ絞り込み |
| type | string | no | `income` or `expense` |
| page | integer | no | ページ番号 (デフォルト: 1) |
| per | integer | no | 件数 (デフォルト: 20, 最大: 100) |

**レスポンス**

```json
{
  "transactions": [
    {
      "id": 1,
      "amount": "5000.0",
      "transaction_type": "expense",
      "description": "スーパーで買い物",
      "occurred_on": "2026-05-30",
      "category": {
        "id": 2,
        "name": "食費",
        "icon": "fa-utensils",
        "color": "#FF6B6B"
      }
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "per": 20
  }
}
```

---

## POST /transactions

収支登録。

**リクエストボディ**

```json
{
  "transaction": {
    "amount": 5000,
    "transaction_type": "expense",
    "description": "スーパーで買い物",
    "occurred_on": "2026-05-30",
    "category_id": 2
  }
}
```

**バリデーション**

| フィールド | ルール |
|---|---|
| amount | 必須・正の数・最大 9999999.99 |
| transaction_type | 必須・`income` or `expense` |
| occurred_on | 必須・日付形式 |
| category_id | 必須・存在するカテゴリ（自分のもの） |

**レスポンス (201 Created)**

```json
{
  "transaction": { ... }
}
```

**エラー (422)**

```json
{
  "errors": {
    "amount": ["は必須です"],
    "category_id": ["は無効です"]
  }
}
```

---

## GET /transactions/:id

収支詳細取得。

**レスポンス (200)**

```json
{
  "transaction": { ... }
}
```

**エラー**

| コード | 説明 |
|---|---|
| 404 | 存在しないまたは他ユーザーの収支 |

---

## PUT /transactions/:id

収支更新。

**リクエストボディ** POST と同じ形式（部分更新可）

**レスポンス (200)**

```json
{
  "transaction": { ... }
}
```
