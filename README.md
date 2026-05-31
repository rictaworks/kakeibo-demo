# kakeibo-demo

家計簿管理アプリのデモプロジェクト。収支の記録・カテゴリ管理・月次レポートを提供する。

## 技術スタック

- フロントエンド: Next.js (Vercel)
- バックエンド: Ruby on Rails API (Render/Railway)
- データベース: PostgreSQL
- 認証: Google OAuth 2.0
- アイコン: FontAwesome
- テスト: RSpec / Jest / Playwright

---

## 自動ログイン（開発環境）

開発環境では認証をバイパスして自動ログイン状態になる。

```bash
# .env に以下を設定
RAILS_ENV=development
AUTO_LOGIN_USER_EMAIL=dev@example.com
```

`RAILS_ENV=development` のとき、バックエンドは認証済みユーザー（`AUTO_LOGIN_USER_EMAIL`）として扱う。
フロントエンドは `NODE_ENV=development` のとき、ログイン画面をスキップしてダッシュボードへリダイレクトする。

---

## ページ一覧

| ページ名 | URL |
|---|---|
| [ログイン](http://localhost:3000/login) | /login |
| [ダッシュボード](http://localhost:3000/) | / |
| [収支一覧](http://localhost:3000/transactions) | /transactions |
| [収支登録](http://localhost:3000/transactions/new) | /transactions/new |
| [収支詳細](http://localhost:3000/transactions/:id) | /transactions/:id |
| [収支編集](http://localhost:3000/transactions/:id/edit) | /transactions/:id/edit |
| [カテゴリ管理](http://localhost:3000/categories) | /categories |
| [月次レポート](http://localhost:3000/reports/monthly) | /reports/monthly |
| [年次レポート](http://localhost:3000/reports/yearly) | /reports/yearly |
| [設定](http://localhost:3000/settings) | /settings |

---

## API一覧

仕様書: [SPEC/api/](./SPEC/api/)

### 認証

| タイトル | エンドポイントURL |
|---|---|
| Google ログイン開始 | `GET /api/v1/auth/google` |
| Google OAuth コールバック | `GET /api/v1/auth/google/callback` |
| ログアウト | `DELETE /api/v1/auth/sessions` |
| ログインユーザー取得 | `GET /api/v1/auth/me` |

### 収支（Transactions）

| タイトル | エンドポイントURL |
|---|---|
| 収支一覧取得 | `GET /api/v1/transactions` |
| 収支登録 | `POST /api/v1/transactions` |
| 収支詳細取得 | `GET /api/v1/transactions/:id` |
| 収支更新 | `PUT /api/v1/transactions/:id` |

### カテゴリ（Categories）

| タイトル | エンドポイントURL |
|---|---|
| カテゴリ一覧取得 | `GET /api/v1/categories` |
| カテゴリ登録 | `POST /api/v1/categories` |
| カテゴリ更新 | `PUT /api/v1/categories/:id` |

### レポート（Reports）

| タイトル | エンドポイントURL |
|---|---|
| 月次レポート取得 | `GET /api/v1/reports/monthly` |
| 年次レポート取得 | `GET /api/v1/reports/yearly` |
| カテゴリ別集計 | `GET /api/v1/reports/by_category` |

---

## ディレクトリ構成

```
kakeibo-demo/
├── src/              # アプリケーションコード（PRが必要）
│   ├── frontend/     # Next.js
│   └── backend/      # Ruby on Rails API
├── TASKS/            # タスク管理
├── DEBUG/            # バグ報告
├── CLIENT/           # クライアント要望
├── WORK/             # 作業報告
├── ENV/              # 環境情報
│   ├── DEVELOPMENT.md
│   └── PRODUCTION.md
├── SPEC/             # 仕様書・設計図
│   ├── api/          # API仕様書
│   └── diagrams/     # ER図・DFD・シーケンス図等
├── DELETE/           # ゴミ箱（手動削除待ちファイル）
└── test/             # テストスクリプト（PR別）
```

---

## セットアップ

```bash
# リポジトリクローン
git clone <repo-url>
cd kakeibo-demo

# 環境変数設定
cp .env.example .env
# .env を編集

# フロントエンド
cd src/frontend
npm install
npm run dev

# バックエンド
cd src/backend
bundle install
rails db:create db:migrate db:seed
rails s
```

---

## 開発ガイドライン

- TDD厳守: plan > red test > coding > green test
- mainブランチへの `src/*` 変更は PR が必須
- commit前に security review を実施
- 詳細は [CLAUDE.md](./CLAUDE.md) を参照
