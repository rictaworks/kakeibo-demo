# ユースケース図 (Use Case Diagram)

最終更新: 2026-05-31

```mermaid
graph LR
    User((ユーザー))

    subgraph kakeibo-demo
        UC1[Google ログイン]
        UC2[ダッシュボード閲覧]
        UC3[収支登録]
        UC4[収支一覧閲覧]
        UC5[収支編集]
        UC6[カテゴリ管理]
        UC7[月次レポート閲覧]
        UC8[年次レポート閲覧]
        UC9[設定変更]
        UC10[ログアウト]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
```
