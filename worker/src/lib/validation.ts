import { EXPENSE_LIMITS, DASHBOARD_LIMITS } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { isValidIsoDate } from "./time";
import type { ValidationIssue } from "./errors";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

export interface ExpenseInput {
  date: string;
  amount: number;
  category_id: number;
  store_name: string | null;
  memo: string | null;
}

/** 部分更新。null は「未指定」と同じ扱い（旧実装の exclude_none と同じ）。 */
export interface ExpenseUpdate {
  date?: string;
  amount?: number;
  category_id?: number;
  store_name?: string;
  memo?: string;
}

type RawObject = Record<string, unknown>;

export function isPlainObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(field: string, msg: string): ValidationIssue {
  return { loc: ["body", field], msg };
}

function parseDate(body: RawObject, required: boolean, issues: ValidationIssue[]): string | undefined {
  const raw = body["date"];
  if (raw === undefined || raw === null) {
    if (required) issues.push(issue("date", MESSAGES.FIELD_REQUIRED));
    return undefined;
  }
  if (typeof raw !== "string" || !isValidIsoDate(raw)) {
    issues.push(issue("date", MESSAGES.DATE_FORMAT));
    return undefined;
  }
  return raw;
}

function parseAmount(body: RawObject, required: boolean, issues: ValidationIssue[]): number | undefined {
  const raw = body["amount"];
  if (raw === undefined || raw === null) {
    if (required) issues.push(issue("amount", MESSAGES.FIELD_REQUIRED));
    return undefined;
  }
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) {
    issues.push(issue("amount", MESSAGES.FIELD_MUST_BE_INTEGER));
    return undefined;
  }
  if (raw < EXPENSE_LIMITS.AMOUNT_MIN || raw > EXPENSE_LIMITS.AMOUNT_MAX) {
    issues.push(issue("amount", MESSAGES.AMOUNT_RANGE));
    return undefined;
  }
  return raw;
}

function parseCategoryId(body: RawObject, required: boolean, issues: ValidationIssue[]): number | undefined {
  const raw = body["category_id"];
  if (raw === undefined || raw === null) {
    if (required) issues.push(issue("category_id", MESSAGES.FIELD_REQUIRED));
    return undefined;
  }
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) {
    issues.push(issue("category_id", MESSAGES.FIELD_MUST_BE_INTEGER));
    return undefined;
  }
  if (raw < EXPENSE_LIMITS.CATEGORY_ID_MIN || raw > EXPENSE_LIMITS.CATEGORY_ID_MAX) {
    issues.push(issue("category_id", MESSAGES.CATEGORY_RANGE));
    return undefined;
  }
  return raw;
}

function parseText(
  body: RawObject,
  field: "store_name" | "memo",
  maxLength: number,
  tooLongMessage: string,
  issues: ValidationIssue[],
): string | null | undefined {
  const raw = body[field];
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    issues.push(issue(field, MESSAGES.FIELD_MUST_BE_TEXT));
    return undefined;
  }
  if ([...raw].length > maxLength) {
    issues.push(issue(field, tooLongMessage));
    return undefined;
  }
  return raw;
}

/** POST /api/expenses の入力（必須項目あり）。 */
export function parseExpenseInput(body: RawObject): ParseResult<ExpenseInput> {
  const issues: ValidationIssue[] = [];
  const date = parseDate(body, true, issues);
  const amount = parseAmount(body, true, issues);
  const categoryId = parseCategoryId(body, true, issues);
  const storeName = parseText(body, "store_name", EXPENSE_LIMITS.STORE_NAME_MAX_LENGTH, MESSAGES.STORE_NAME_TOO_LONG, issues);
  const memo = parseText(body, "memo", EXPENSE_LIMITS.MEMO_MAX_LENGTH, MESSAGES.MEMO_TOO_LONG, issues);
  if (issues.length > 0 || date === undefined || amount === undefined || categoryId === undefined) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      date,
      amount,
      category_id: categoryId,
      store_name: storeName ?? null,
      memo: memo ?? null,
    },
  };
}

/** PUT /api/expenses/{id} の入力（全項目任意）。 */
export function parseExpenseUpdate(body: RawObject): ParseResult<ExpenseUpdate> {
  const issues: ValidationIssue[] = [];
  const update: ExpenseUpdate = {};
  const date = parseDate(body, false, issues);
  const amount = parseAmount(body, false, issues);
  const categoryId = parseCategoryId(body, false, issues);
  const storeName = parseText(body, "store_name", EXPENSE_LIMITS.STORE_NAME_MAX_LENGTH, MESSAGES.STORE_NAME_TOO_LONG, issues);
  const memo = parseText(body, "memo", EXPENSE_LIMITS.MEMO_MAX_LENGTH, MESSAGES.MEMO_TOO_LONG, issues);
  if (issues.length > 0) return { ok: false, issues };
  if (date !== undefined) update.date = date;
  if (amount !== undefined) update.amount = amount;
  if (categoryId !== undefined) update.category_id = categoryId;
  if (storeName !== undefined && storeName !== null) update.store_name = storeName;
  if (memo !== undefined && memo !== null) update.memo = memo;
  return { ok: true, value: update };
}

/** クエリ文字列の整数。未指定は undefined。整数でなければ入力エラー。 */
export function parseIntegerQuery(
  field: string,
  raw: string | undefined,
): ParseResult<number | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (!/^-?\d+$/.test(raw)) {
    return { ok: false, issues: [{ loc: ["query", field], msg: MESSAGES.FIELD_MUST_BE_INTEGER }] };
  }
  return { ok: true, value: Number(raw) };
}

/** パスパラメータ（ID）の正の整数。 */
export function parsePathId(raw: string): ParseResult<number> {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return { ok: false, issues: [{ loc: ["path", "expense_id"], msg: MESSAGES.FIELD_MUST_BE_INTEGER }] };
  }
  return { ok: true, value: Number(raw) };
}

export function isYearInRange(year: number): boolean {
  return year >= DASHBOARD_LIMITS.YEAR_MIN && year <= DASHBOARD_LIMITS.YEAR_MAX;
}

export function isMonthInRange(month: number): boolean {
  return month >= DASHBOARD_LIMITS.MONTH_MIN && month <= DASHBOARD_LIMITS.MONTH_MAX;
}
