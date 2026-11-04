import { JST_OFFSET_MS } from "../config/constants";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 旧 Python 実装の datetime.isoformat（UTC, +00:00 表記）に合わせた現在時刻文字列。 */
export function utcIsoNow(now: Date): string {
  return now.toISOString().replace("Z", "+00:00");
}

/** 厳密な YYYY-MM-DD 形式で、実在する日付かどうか（date.fromisoformat 相当）。 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** JST（Asia/Tokyo）での今日の日付を YYYY-MM-DD で返す。 */
export function jstTodayIso(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** JST 基準の現在の年と月。 */
export function jstYearMonth(now: Date): { year: number; month: number } {
  const [year, month] = jstTodayIso(now).split("-").map(Number) as [number, number, number];
  return { year, month };
}

/**
 * ISO 8601 週番号（月曜始まり）。旧実装の date.isocalendar()[1] と同じ値を返す。
 * 不正な日付の場合は null。
 */
export function isoWeekNumber(value: string): number | null {
  if (!isValidIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  // 月曜=0 ... 日曜=6 とし、その週の木曜日に移動すると ISO 週の年が決まる
  const dayOfWeek = (date.getUTCDay() + 6) % 7;
  const thursday = new Date(date.getTime() + (3 - dayOfWeek) * MS_PER_DAY);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDayOfWeek = (firstThursday.getUTCDay() + 6) % 7;
  const firstWeekThursday = new Date(firstThursday.getTime() + (3 - firstDayOfWeek) * MS_PER_DAY);
  return 1 + Math.round((thursday.getTime() - firstWeekThursday.getTime()) / (7 * MS_PER_DAY));
}

export function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}
