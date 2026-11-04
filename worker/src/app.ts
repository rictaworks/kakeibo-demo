import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { MESSAGES } from "./config/messages";
import type { AppEnv } from "./env";
import { ApiError } from "./lib/errors";
import { createDashboardRoutes } from "./routes/dashboard";
import { createExpenseRoutes } from "./routes/expenses";
import { createReceiptRoutes } from "./routes/receipts";

/** 旧 backend/main.py に相当する Hono アプリ。API は /api 配下、ヘルスチェックは /health。 */
export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.route("/api/expenses", createExpenseRoutes());
  app.route("/api/dashboard", createDashboardRoutes());
  app.route("/api/receipts", createReceiptRoutes());

  app.notFound((c) => c.json({ detail: MESSAGES.NOT_FOUND }, 404));

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json({ detail: error.detail }, error.status as ContentfulStatusCode);
    }
    // 想定外の例外は握りつぶさずログに残してから 500 を返す
    console.error(
      `ERROR app: unhandled error on ${c.req.method} ${c.req.path}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return c.json({ detail: MESSAGES.INTERNAL_ERROR }, 500);
  });

  return app;
}
