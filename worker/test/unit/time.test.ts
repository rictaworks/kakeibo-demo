import { describe, expect, it } from "vitest";
import { isValidIsoDate, isoWeekNumber, jstTodayIso, utcIsoNow } from "../../src/lib/time";

describe("isoWeekNumber（旧 date.isocalendar()[1] と同じ値）", () => {
  it.each([
    ["2026-05-31", 22],
    ["2026-01-01", 1],
    ["2025-12-29", 1],
    ["2026-12-31", 53],
    ["2027-01-01", 53],
  ])("%s は ISO 週 %i", (date, week) => {
    expect(isoWeekNumber(date)).toBe(week);
  });

  it("不正な日付は null", () => {
    expect(isoWeekNumber("2026-02-30")).toBeNull();
    expect(isoWeekNumber("not-a-date")).toBeNull();
  });
});

describe("isValidIsoDate（date.fromisoformat 相当）", () => {
  it("実在する YYYY-MM-DD を受け付ける", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
  });

  it("存在しない日付や形式違いを拒否する", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026/05/31")).toBe(false);
    expect(isValidIsoDate("20260531")).toBe(false);
  });
});

describe("時刻の変換", () => {
  it("JST の日付は UTC 15:00 以降で翌日になる", () => {
    expect(jstTodayIso(new Date("2026-10-31T14:59:59Z"))).toBe("2026-10-31");
    expect(jstTodayIso(new Date("2026-10-31T15:00:00Z"))).toBe("2026-11-01");
  });

  it("utcIsoNow は +00:00 表記（旧 Python の isoformat と同じ）", () => {
    expect(utcIsoNow(new Date("2026-05-31T10:00:00.000Z"))).toBe("2026-05-31T10:00:00.000+00:00");
  });
});
