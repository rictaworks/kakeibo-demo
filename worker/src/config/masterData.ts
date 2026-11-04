// 支出カテゴリのマスタ（SPEC/api/transactions.md のカテゴリマスタ・固定8件）。
// categories テーブルは migrations/0001_init.sql で同じ内容を投入する（test/unit/migration.test.ts で一致を確認）。

export interface CategoryMaster {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
}

export const CATEGORIES: readonly CategoryMaster[] = [
  { id: 1, name: "食料品", icon: "fa-solid fa-basket-shopping" },
  { id: 2, name: "外食", icon: "fa-solid fa-utensils" },
  { id: 3, name: "交通", icon: "fa-solid fa-train" },
  { id: 4, name: "医療・健康", icon: "fa-solid fa-heart-pulse" },
  { id: 5, name: "衣類・美容", icon: "fa-solid fa-shirt" },
  { id: 6, name: "日用品", icon: "fa-solid fa-soap" },
  { id: 7, name: "娯楽", icon: "fa-solid fa-gamepad" },
  { id: 8, name: "その他", icon: "fa-solid fa-circle-dot" },
];

export const CATEGORY_ID = {
  GROCERIES: 1,
  DINING: 2,
  TRANSPORT: 3,
  HEALTH: 4,
  FASHION: 5,
  DAILY: 6,
  LEISURE: 7,
  OTHER: 8,
} as const;
