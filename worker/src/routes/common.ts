import type { Context } from "hono";
import { MESSAGES } from "../config/messages";
import { resolveEnvironment, type AppEnv } from "../env";
import { validationError } from "../lib/errors";
import { createLogger, type Logger } from "../lib/logger";
import { isPlainObject } from "../lib/validation";

/** JSON のオブジェクトを読む。不正な JSON やオブジェクト以外は 422 にする。 */
export async function readJsonObject(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await c.req.json();
  } catch {
    throw validationError([{ loc: ["body"], msg: MESSAGES.INVALID_JSON_BODY }]);
  }
  if (!isPlainObject(parsed)) {
    throw validationError([{ loc: ["body"], msg: MESSAGES.INVALID_JSON_BODY }]);
  }
  return parsed;
}

export function loggerFor(c: Context<AppEnv>, scope: string): Logger {
  return createLogger(scope, resolveEnvironment(c.env.ENV));
}
