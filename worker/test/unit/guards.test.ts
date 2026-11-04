import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../src/config/masterData";
import { resolveEnvironment } from "../../src/env";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(here, "../../src");
const MIGRATION_FILE = path.resolve(here, "../../../migrations/0001_init.sql");
const CONFIG_DIR = path.join(SRC_DIR, "config");

// 日本語（ひらがな・カタカナ・漢字）を含むか。コメント行は対象外。
const JAPANESE_PATTERN = /[぀-ヿ一-鿿]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

describe("ハードコードの禁止（文字列リテラルは config/ に分離する）", () => {
  it("config/ 以外のソースに日本語の文字列リテラルがない", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC_DIR)) {
      if (file.startsWith(CONFIG_DIR)) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
          if (JAPANESE_PATTERN.test(line)) {
            offenders.push(`${path.relative(SRC_DIR, file)}:${index + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});

describe("環境判定（development / test / production）", () => {
  it("既知の値は受け付け、未設定・未知の値は例外（フォールバックしない）", () => {
    expect(resolveEnvironment("development")).toBe("development");
    expect(resolveEnvironment("test")).toBe("test");
    expect(resolveEnvironment("production")).toBe("production");
    expect(() => resolveEnvironment(undefined)).toThrow();
    expect(() => resolveEnvironment("staging")).toThrow();
  });
});

describe("マスタの整合（migrations/0001_init.sql と config/masterData.ts）", () => {
  it("カテゴリの id・名称・アイコンが SQL の投入値と一致する", () => {
    const sql = readFileSync(MIGRATION_FILE, "utf8");
    for (const category of CATEGORIES) {
      expect(sql).toContain(`(${category.id}, '${category.name}', '${category.icon}')`);
    }
  });
});
