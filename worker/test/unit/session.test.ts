import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SESSION } from "../../src/config/constants";
import { buildSessionCookie, hashSessionId, parseSessionCookie } from "../../src/session/session";

describe("parseSessionCookie", () => {
  it("session_id の値を取り出す（他の Cookie が混ざっていても）", () => {
    expect(parseSessionCookie("theme=dark; session_id=abc-123; lang=ja")).toBe("abc-123");
  });

  it("Cookie が無い・空・別名の場合は undefined", () => {
    expect(parseSessionCookie(undefined)).toBeUndefined();
    expect(parseSessionCookie("")).toBeUndefined();
    expect(parseSessionCookie("session_id_old=abc")).toBeUndefined();
    expect(parseSessionCookie("session_id=")).toBeUndefined();
  });
});

describe("buildSessionCookie（SPEC/api/auth.md の Cookie 属性）", () => {
  it("HttpOnly・SameSite=Lax・24時間。開発では Secure を付けない", () => {
    const cookie = buildSessionCookie("raw-id", false);
    expect(cookie).toContain("session_id=raw-id");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${SESSION.MAX_AGE_SECONDS}`);
    expect(cookie).not.toContain("Secure");
  });

  it("本番では Secure を付ける", () => {
    expect(buildSessionCookie("raw-id", true)).toContain("; Secure");
  });
});

describe("hashSessionId", () => {
  it("SHA-256 の 16 進表記（64 文字）で、Node の createHash と一致する", async () => {
    const raw = "test-session-id";
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");
    expect(await hashSessionId(raw)).toBe(expected);
    expect((await hashSessionId(raw)).length).toBe(64);
  });
});
