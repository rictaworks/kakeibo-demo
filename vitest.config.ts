import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["worker/test/**/*.test.ts"],
    // アプリのログ出力はテスト成功時には表示しない（失敗したテストのログだけ見えるようにする）
    silent: "passed-only",
  },
});
