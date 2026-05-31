# kakeibo-demo

レシート撮影だけで自動分類・節約提案するAI家計簿のデモアプリ。

> **デモ版制約**: 外部API不使用・認証なし・SQLite（毎日JST 03:00自動リセット）

## 技術スタック

| 層 | 技術 | 備考 |
|---|---|---|
| フロントエンド | Next.js 14 (TypeScript) | Vercel（無料） |
| バックエンドAPI | FastAPI (Python) | Render（無料） |
| OCR処理 | pytesseract + OpenCV | ローカル処理、外部API不使用 |
| データベース | SQLite | 毎日JST 03:00 自動リセット |
| スケジューラー | APScheduler | FastAPI内で動作 |
| スタイリング | Tailwind CSS | |
| グラフ | Chart.js + react-chartjs-2 | |
| アイコン | FontAwesome | |
| テスト | pytest / Jest | |

---

## 画面一覧

| 画面名 | URL | 説明 |
|---|---|---|
| ダッシュボード | `/` | 月別集計・グラフ・節約提案・支出一覧 |
| レシートアップロード | `/upload` | 撮影→OCR→確認→保存 / 手動入力 |

---

## API一覧

Base URL: `http://localhost:8000`

### セッション

セッションはCookieで自動管理される。初回アクセス時にサーバーが自動発行。認証不要。

### レシートアップロード

| メソッド | エンドポイント | 説明 |
|---|---|---|
| `POST` | `/api/receipts/upload` | OCR処理・自動分類 |

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
| `GET` | `/health` | サーバー死活確認 |

---

## ディレクトリ構成

```
kakeibo-demo/
├── backend/                   # FastAPI (Python)
│   ├── main.py                # アプリ本体・CORS・ミドルウェア
│   ├── requirements.txt
│   ├── routers/
│   │   ├── receipts.py        # OCRアップロードAPI
│   │   ├── expenses.py        # 支出CRUD API
│   │   └── dashboard.py       # 集計API
│   ├── services/
│   │   ├── session.py         # セッション管理
│   │   ├── image_processor.py # 画像検証・OpenCV前処理
│   │   ├── ocr_engine.py      # pytesseract OCR
│   │   ├── classifier.py      # ルールベース分類
│   │   ├── dashboard_service.py
│   │   └── suggester.py       # 節約提案（5ルール）
│   ├── models/
│   │   └── db.py              # SQLiteスキーマ・接続
│   ├── scheduler.py           # APScheduler（JST 03:00 DBリセット）
│   ├── tests/
│   │   ├── test_classifier.py
│   │   └── test_session.py
│   └── db/
│       └── kakeibo.sqlite3    # SQLite（.gitignore対象）
│
├── frontend/                  # Next.js (TypeScript)
│   ├── pages/
│   │   ├── _app.tsx           # FontAwesome初期化・グローバルCSS
│   │   ├── index.tsx          # ダッシュボードページ
│   │   └── upload.tsx         # アップロードページ
│   ├── components/
│   │   ├── Dashboard.tsx      # グラフ・集計表示
│   │   ├── UploadForm.tsx     # ドラッグ&ドロップ・ハニーポット
│   │   ├── OcrConfirm.tsx     # OCR結果確認・編集
│   │   ├── ManualForm.tsx     # 手動入力フォーム
│   │   └── SuggestionCard.tsx # 節約提案カード
│   ├── lib/
│   │   └── api.ts             # API型定義・フェッチ関数
│   └── styles/
│       └── globals.css
│
├── SPEC/                      # 仕様書・設計図
├── TASKS/                     # タスク管理
├── DEBUG/                     # バグ報告
├── CLIENT/                    # クライアント要望
├── WORK/                      # 作業報告
├── ENV/                       # 環境情報
└── DELETE/                    # ゴミ箱（手動削除待ち）
```

---

## セットアップ

### バックエンド

```bash
cd backend

# 仮想環境（任意）
python3 -m venv .venv
source .venv/bin/activate

# 依存パッケージインストール
pip install -r requirements.txt

# Tesseractのインストール（OS別）
# macOS: brew install tesseract tesseract-lang
# Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-jpn

# 起動
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 環境変数

```bash
# .env（プロジェクトルート）
DATABASE_URL=backend/db/kakeibo.sqlite3
NEXT_PUBLIC_API_URL=http://localhost:8000

# 本番環境追加設定
ENV=production           # Cookieをsecure=Trueにする
FRONTEND_URL=https://...  # CORS許可オリジン
```

---

## テスト

```bash
# バックエンド（pytest）
cd backend
python3 -m pytest tests/ -v

# フロントエンド
cd frontend
npm test
```

---

## デプロイ

| 対象 | プラットフォーム | 備考 |
|---|---|---|
| フロントエンド | Vercel（無料） | `frontend/` をルートに設定 |
| バックエンド | Render / Railway（無料） | `uvicorn main:app` |

---

## 開発ガイドライン

- TDD厳守: plan > red test > coding > green test
- `backend/` `frontend/` の変更は PR が必須
- commit前に security review を実施
- 詳細は [CLAUDE.md](./CLAUDE.md) を参照
