# API仕様 - 認証 (Auth)

Base URL: `/api/v1`

---

## GET /auth/google

Google OAuth 認可 URL を返す。

**レスポンス**

```json
{
  "url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

---

## GET /auth/google/callback

Google OAuth コールバック。JWT を発行してフロントへリダイレクト。

**クエリパラメータ**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| code | string | yes | Google 認可コード |
| state | string | yes | CSRF 防止トークン |

**レスポンス（成功時）**

フロントエンドにリダイレクト。Cookie に JWT をセット。

**エラー**

| コード | 説明 |
|---|---|
| 401 | 認証失敗 |
| 500 | サーバーエラー |

---

## DELETE /auth/sessions

ログアウト。JWT Cookie を無効化する。

**ヘッダー**

| 名前 | 値 |
|---|---|
| Authorization | Bearer {JWT} |

**レスポンス**

```json
{
  "message": "ログアウトしました"
}
```

---

## GET /auth/me

ログイン中ユーザー情報を取得する。

**ヘッダー**

| 名前 | 値 |
|---|---|
| Authorization | Bearer {JWT} |

**レスポンス**

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "田中 太郎",
  "locale": "ja"
}
```

**エラー**

| コード | 説明 |
|---|---|
| 401 | 未認証 |
