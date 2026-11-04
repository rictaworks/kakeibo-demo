import { createApp } from "./app";
import type { Bindings } from "./env";
import { resolveEnvironment } from "./env";
import { createLogger } from "./lib/logger";
import { runDailyReset } from "./services/dailyReset";

// Hono アプリは読み取り専用の構成のみを持つ（リクエスト間で共有される可変状態はない）。
const app = createApp();

export default {
  fetch: app.fetch,

  /** JST 03:00（UTC 18:00）の日次リセット（wrangler.jsonc の triggers.crons）。 */
  async scheduled(_controller: ScheduledController, env: Bindings, _ctx: ExecutionContext): Promise<void> {
    const logger = createLogger("scheduled", resolveEnvironment(env.ENV));
    await runDailyReset(env.DB, logger);
  },
} satisfies ExportedHandler<Bindings>;
