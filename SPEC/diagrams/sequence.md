# シーケンス図 (Sequence Diagram)

最終更新: 2026-05-31

## レシートアップロード〜保存フロー

```mermaid
sequenceDiagram
    actor User
    participant Front as Next.js
    participant API as FastAPI
    participant DB as SQLite

    User->>Front: レシート画像を選択（drag&drop/クリック）
    Front->>Front: クライアントバリデーション（MIME・サイズ）
    Front->>API: POST /api/receipts/upload (multipart/form-data)
    API->>API: ハニーポットチェック
    API->>API: セッション確認（なければ自動生成）
    API->>DB: sessions 確認 / INSERT
    DB-->>API: OK
    API->>API: マジックバイト検証
    API->>API: OpenCV前処理（グレースケール・二値化・歪み補正）
    API->>API: pytesseract OCR（最大10秒）
    API->>API: ルールベース分類
    API-->>Front: {ocr_result, classification, needs_manual}
    Front->>User: OCR結果確認画面 or 手動入力フォーム
    User->>Front: 内容確認・修正して保存
    Front->>API: POST /api/expenses
    API->>DB: INSERT expenses
    DB-->>API: OK
    API-->>Front: {id, created_at}
    Front->>Front: router.push('/')
    Front-->>User: ダッシュボードへ遷移
```

## DBリセットフロー

```mermaid
sequenceDiagram
    participant Scheduler as APScheduler
    participant API as FastAPI
    participant DB as SQLite

    Scheduler->>API: JST 03:00 run_reset() 呼び出し
    API->>API: resetting.lock 生成
    Note over API: 以降のAPIリクエストは503を返す
    API->>DB: DELETE FROM expenses
    DB-->>API: OK
    API->>DB: DELETE FROM sessions
    DB-->>API: OK
    API->>DB: VACUUM
    DB-->>API: OK
    API->>API: resetting.lock 削除
    Note over API: 通常運転再開
```

## セッション自動生成フロー

```mermaid
sequenceDiagram
    actor User
    participant Front as Next.js
    participant API as FastAPI
    participant DB as SQLite

    User->>Front: 初回アクセス
    Front->>API: GET /api/dashboard（Cookieなし）
    API->>API: Cookie なし → 新セッション生成
    API->>API: UUID v4 → SHA-256ハッシュ
    API->>DB: INSERT sessions
    DB-->>API: OK
    API-->>Front: Set-Cookie: session_id=<raw_uuid>; HttpOnly
    Front-->>User: ダッシュボード表示
```
