# API仕様 - 支出 (Expenses)

> **注意**: このファイルは旧収支API仕様（Rails/JWT）から変更されました。

Base URL: `http://localhost:8000`

全エンドポイントで Cookie（`session_id`）によるセッション認証が必要。
Cookie が未設定の場合はサーバーが自動生成する。

---

## GET /api/expenses

自セッションの支出一覧を取得する。

**レスポンス (200)**

```json
[
  {
    "id": 1,
    "session_id": "abcdef...",
    "category_id": 1,
    "category_name": "食料品",
    "category_icon": "fa-solid fa-basket-shopping",
    "date": "2026-05-31",
    "amount": 1200,
    "store_name": "イオン 渋谷店",
    "memo": null,
    "created_at": "2026-05-31T10:00:00+00:00",
    "updated_at": "2026-05-31T10:00:00+00:00"
  }
]
```

---

## POST /api/expenses

支出を新規保存する。

**リクエストボディ**

```json
{
  "date": "2026-05-31",
  "amount": 1200,
  "category_id": 1,
  "store_name": "イオン 渋谷店",
  "memo": "週の買い物"
}
```

**バリデーション**

| フィールド | ルール |
|---|---|
| `date` | 必須・YYYY-MM-DD形式 |
| `amount` | 必須・1以上の整数（円単位） |
| `category_id` | 必須・1〜8（カテゴリマスタ参照） |
| `store_name` | 任意・最大100文字 |
| `memo` | 任意・最大500文字 |

**レスポンス (200)**

```json
{
  "id": 1,
  "created_at": "2026-05-31T10:00:00+00:00"
}
```

**エラー (422)**

```json
{
  "detail": [
    { "loc": ["body", "amount"], "msg": "Input should be greater than 0" }
  ]
}
```

---

## PUT /api/expenses/{id}

支出を更新する。自セッションのデータのみ更新可能。

**パスパラメータ**

| 名前 | 型 | 説明 |
|---|---|---|
| `id` | integer | 支出ID |

**リクエストボディ**（部分更新可）

```json
{
  "amount": 1500,
  "category_id": 2
}
```

**レスポンス (200)**

```json
{
  "id": 1,
  "updated": true
}
```

**エラー**

| ステータス | 説明 |
|---|---|
| `404` | 支出が存在しない、または他セッションのデータ |
| `400` | 更新フィールドが指定されていない |

---

## DELETE /api/expenses/{id}

支出を削除する。自セッションのデータのみ削除可能。

**パスパラメータ**

| 名前 | 型 | 説明 |
|---|---|---|
| `id` | integer | 支出ID |

**レスポンス (200)**

```json
{
  "id": 1,
  "deleted": true
}
```

**エラー**

| ステータス | 説明 |
|---|---|
| `404` | 支出が存在しない、または他セッションのデータ |

---

## カテゴリマスタ（固定8件）

| id | name | icon |
|---|---|---|
| 1 | 食料品 | `fa-solid fa-basket-shopping` |
| 2 | 外食 | `fa-solid fa-utensils` |
| 3 | 交通 | `fa-solid fa-train` |
| 4 | 医療・健康 | `fa-solid fa-heart-pulse` |
| 5 | 衣類・美容 | `fa-solid fa-shirt` |
| 6 | 日用品 | `fa-solid fa-soap` |
| 7 | 娯楽 | `fa-solid fa-gamepad` |
| 8 | その他 | `fa-solid fa-circle-dot` |
