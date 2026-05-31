# DFD - データフロー図 (Data Flow Diagram)

最終更新: 2026-05-31

## レベル0（コンテキスト図）

```mermaid
graph LR
    User((ユーザー))
    Google((Google))
    System[kakeibo-demo]

    User -->|ログイン・収支入力| System
    System -->|レポート・収支一覧| User
    System -->|OAuth リクエスト| Google
    Google -->|認証情報| System
```

## レベル1（主要プロセス）

```mermaid
graph TD
    User((ユーザー))

    P1[認証処理]
    P2[収支管理]
    P3[カテゴリ管理]
    P4[レポート生成]

    DS1[(users)]
    DS2[(transactions)]
    DS3[(categories)]

    User -->|ログイン情報| P1
    P1 -->|ユーザー情報| DS1
    DS1 -->|認証済みユーザー| P1
    P1 -->|JWT| User

    User -->|収支データ| P2
    P2 -->|保存| DS2
    DS2 -->|収支一覧| P2
    P2 -->|収支一覧| User

    User -->|カテゴリ情報| P3
    P3 -->|保存| DS3
    DS3 -->|カテゴリ一覧| P3
    P3 -->|カテゴリ一覧| User

    DS2 -->|集計対象| P4
    DS3 -->|カテゴリ情報| P4
    P4 -->|月次・年次レポート| User
```
