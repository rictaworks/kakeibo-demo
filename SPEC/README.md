# SPEC - 仕様書・設計図

このディレクトリはプロジェクトの仕様書と設計図を管理する。

## 構成

```
SPEC/
├── kakeibo-demo-spec.md   # 総合仕様書（読み取り専用）
├── api/
│   ├── session.md         # セッション管理API
│   ├── receipts.md        # レシートアップロードAPI
│   ├── expenses.md        # 支出CRUD API
│   └── dashboard.md       # ダッシュボードAPI
├── diagrams/
│   ├── er.md              # ER図
│   ├── dfd.md             # DFD（データフロー図）
│   ├── sequence.md        # シーケンス図
│   ├── state.md           # 状態遷移図
│   └── usecase.md         # ユースケース図
└── README.md              # このファイル
```

## 図解ツール

Mermaid を使用すること。GitHub / VS Code で自動レンダリングされる。
