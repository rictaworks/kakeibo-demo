# kakeibo-demo

レシート撮影だけで自動分類・節約提案するAI家計簿のデモアプリ。

> **デモ版制約**: 外部API不使用・認証なし・D1（SQLite）で毎日JST 03:00に自動リセット

## 技術スタック

| 層 | 技術 | 備考 |
|---|---|---|
| フロントエンド | Next.js 16 (TypeScript・静的書き出し) | Cloudflare Workers Assets で配信。CSP は `frontend/public/_headers` |
| バックエンドAPI | Hono (TypeScript) | Cloudflare Workers（`worker/src/`） |
| データベース | Cloudflare D1（SQLite） | スキーマは `migrations/`。毎日JST 03:00に支出とセッションを削除 |
| 日次リセット | Cron Triggers | `wrangler.jsonc` の `triggers.crons`（UTC 18:00 = JST 03:00） |
| OCR処理（未移行） | Python（pytesseract + OpenCV） | 旧実装は `backend/`。Containers に載せる予定。現在の Worker は検証後 501 を返す |
| スタイリング | Tailwind CSS | |
| グラフ | Chart.js + react-chartjs-2 | |
| アイコン | FontAwesome | |
| テスト | vitest（Worker）／ Jest（フロント）／ pytest（旧 backend） | |

---

## 画面一覧

| 画面名 | URL | 説明 |
|---|---|---|
| ダッシュボード | `/` | 月別集計・グラフ・節約提案・支出一覧 |
| レシートアップロード | `/upload` | 撮影→OCR→確認→保存 / 手動入力 |

---

## API一覧

Base URL: `http://127.0.0.1:8787`（`npm run dev`）。本番は同一オリジン（フロントと同じ Worker）。

### セッション

セッションはCookieで自動管理される。初回アクセス時にサーバーが自動発行。認証不要。
Cookie は `HttpOnly`・`SameSite=Lax`・24時間。本番（`ENV=production`）のみ `Secure` を付ける。

### レシートアップロード

| メソッド | エンドポイント | 説明 |
|---|---|---|
| `POST` | `/api/receipts/upload` | 入力検証（ハニーポット・形式・サイズ・マジックバイト）。**検証を通ると現在は 501**（OCR は Containers 側に未接続） |

### 支出 (Expenses)

| メソッド | エンドポイント | 説明 |
|---|---|---|
| `GET` | `/api/expenses` | 支出一覧取得（自セッションのみ） |
| `POST` | `/api/expenses` | 支出保存 |
| `PUT` | `/api/expenses/{id}` | 支出更新 |
| `DELETE` | `/api/expenses/{id}` | 支出削除 |

### ダッシュボード

| メソッド | エンドポイント | 説明 |
|---|---|---|
| `GET` | `/api/dashboard` | 月別・カテゴリ別・日別集計 + 節約提案 |

### ヘルスチェック

| メソッド | エンドポイント | 説明 |
|---|---|---|
| `GET` | `/health` | Worker の死活確認 |

---

## ディレクトリ構成

```
kakeibo-demo/
├── wrangler.jsonc              # Workers・D1・Assets・Cron の設定（account_id 明記）
├── package.json                # Worker 側のスクリプト（dev / test / typecheck ほか）
├── tsconfig.json / vitest.config.ts
├── migrations/
│   └── 0001_init.sql           # D1 スキーマ＋カテゴリマスタ
├── worker/                     # Hono (TypeScript) の API
│   ├── src/
│   │   ├── index.ts            # fetch / scheduled（日次リセット）
│   │   ├── app.ts              # ルーティング・エラー応答
│   │   ├── config/             # 文字列・閾値・カテゴリマスタ（ハードコード禁止）
│   │   ├── session/            # Cookie セッション（UUID を SHA-256 で保存）
│   │   ├── routes/             # expenses / dashboard / receipts
│   │   ├── services/           # 節約提案・分類・画像検証・日次リセット
│   │   ├── db/                 # D1 リポジトリ
│   │   └── lib/                # 時刻・入力検証・ログ・エラー
│   └── test/                   # unit / integration（node:sqlite で D1 を模擬）
│
├── frontend/                   # Next.js (TypeScript・静的書き出し → frontend/out)
│   ├── pages/
│   │   ├── _app.tsx            # FontAwesome初期化・グローバルCSS
│   │   ├── index.tsx           # ダッシュボードページ
│   │   └── upload.tsx          # アップロードページ
│   ├── components/             # Dashboard / UploadForm / OcrConfirm / ManualForm / SuggestionCard
│   ├── lib/api.ts              # API型定義・フェッチ関数（同一オリジンの /api を呼ぶ）
│   └── styles/globals.css
│
├── backend/                    # 旧 FastAPI 実装（OCR は Containers 側に残す。移行後に整理）
├── railway.toml                # 旧デプロイ設定（未使用）
├── frontend/vercel.json        # 旧デプロイ設定（未使用）
│
├── SPEC/                       # 仕様書・設計図
├── TASKS/                      # タスク管理
├── DEBUG/                      # バグ報告
├── CLIENT/                     # クライアント要望
├── WORK/                       # 作業報告
├── ENV/                        # 環境情報
└── DELETE/                     # ゴミ箱（手動削除待ち）
```

---

## セットアップ

### 1. 依存パッケージ

```bash
npm install                      # ルート（Worker・wrangler）
npm --prefix frontend install    # フロントエンド
```

### 2. ローカル D1 にスキーマを適用

```bash
npm run db:migrate:local
```

### 3. 起動

```bash
npm run build:frontend           # frontend/out を生成（Workers Assets の配信元）
npm run dev                      # http://127.0.0.1:8787 で API と静的ファイルを配信
```

フロントエンドをホットリロードで開発する場合は `cd frontend && npm run dev`（`/api/*` は `API_ORIGIN`、既定 `http://127.0.0.1:8787` へ転送される）。`npm run dev` を並行して起動しておくこと。

### 環境変数

| 名前 | 値 | 用途 |
|---|---|---|
| `ENV` | `development` / `test` / `production` | 環境判定。`production` のみ Cookie に `Secure` を付ける。未設定・未知の値は例外 |

- 既定値は `production`（`wrangler.jsonc` の `vars.ENV` と `env.production`）。Secure を外すのはローカル開発だけ。
- ローカルでは `.dev.vars.example` を `.dev.vars` にコピーして `ENV=development` にする（`.dev.vars` はコミットしない）。値はコマンド行に書かない。
- フロントエンドに `NEXT_PUBLIC_API_URL` は不要（同一オリジンの `/api` を使う）。

---

### 安全策（現状）

- **セッション発行の上限**: Cookie なしのリクエストは 10 分間に接続元 IP 1 件あたり 30 件まで。超えると 429。IP は `CF-Connecting-IP` から取り、SHA-256 のみを保存する。記録は日次リセットで消える。
- **金額の上限**: 1 件 1,000 万円まで（入力値の上限。合計の上限ではない）。
- **CSP**: `frontend/public/_headers` で配信。`script-src` と `style-src` は `'unsafe-inline'` を許可している（Next.js の静的書き出しと GA のインライン初期化のため。ハッシュ化は未対応）。

## テスト

```bash
npm run typecheck                            # Worker の型検査（tsc --noEmit）
npm test                                     # Worker（vitest）: 単体 + API 結合（D1 は node:sqlite で模擬）
cd frontend && npm test                      # フロントエンド（Jest。テストはまだ無い）
cd backend && python3 -m pytest tests/ -v    # 旧 backend（移行後も残置）
```

---

## デプロイ（Cloudflare）

**現時点では未デプロイ。** 手順:

1. `npx wrangler d1 create kakeibo_demo` で D1 を作成し、`wrangler.jsonc` の `database_id`（`REPLACE_WITH_D1_DATABASE_ID`、トップレベルと `env.production` の両方）を作成された ID に置き換える。
2. 本番 D1 にスキーマを適用: `npx wrangler d1 migrations apply kakeibo_demo --remote --env production`
3. フロントエンドを書き出す: `npm run build:frontend`
4. Worker と Assets を反映: `npm run deploy:production`

- Cloudflare の API トークンは既存の名前付きトークンを使い、新規発行もロールもしない（ルート `CLAUDE.md`）。
- OCR（Python）を Containers に載せるまで、`/api/receipts/upload` は 501 を返す。

---

## 開発ガイドライン

- TDD厳守: plan > red test > coding > green test
- `backend/` `frontend/` の変更は PR が必須
- commit前に security review を実施
- 詳細は [CLAUDE.md](./CLAUDE.md) を参照
