# API仕様 - ダッシュボード (Dashboard)

Base URL: `http://localhost:8000`

---

## GET /api/dashboard

指定月の集計データと節約提案を返す。

**クエリパラメータ**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| `year` | integer | no | 年（省略時: 現在年） |
| `month` | integer | no | 月 1〜12（省略時: 現在月） |

**レスポンス (200)**

```json
{
  "monthly_totals": [
    { "year": 2026, "month": 5, "total": 42500 }
  ],
  "category_totals": [
    {
      "category_id": 1,
      "category_name": "食料品",
      "category_icon": "fa-solid fa-basket-shopping",
      "total": 18000,
      "count": 12
    }
  ],
  "daily_series": [
    { "date": "2026-05-01", "total": 1200 },
    { "date": "2026-05-03", "total": 3400 }
  ],
  "suggestions": [
    {
      "rule": "dining",
      "message": "今月の外食費が35,000円です。自炊を増やすと節約できます。",
      "amount": 35000
    }
  ]
}
```

**節約提案ルール（最大3件）**

| rule | 発動条件 | メッセージ内容 |
|---|---|---|
| `dining` | 外食合計 ≥ 30,000円 | 外食費の金額を通知 |
| `frequency` | コンビニ週3回以上 | 週あたり利用回数を通知 |
| `monthly_diff` | 先月比 +20%以上 | 増加率（%）を通知 |
| `budget_pace` | 15日時点で18,000円超 | 前半支出金額を通知 |
| `category_ratio` | 1カテゴリが全体40%超 | カテゴリ名と割合を通知 |

**エラー**

| ステータス | 説明 |
|---|---|
| `400` | `month` が 1〜12 の範囲外 |
| `503` | DBリセット中 |
