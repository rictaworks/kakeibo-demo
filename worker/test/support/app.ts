import type { Hono } from "hono";
import { createApp } from "../../src/app";
import type { AppEnv, Bindings } from "../../src/env";
import { SqliteD1 } from "./d1";

export interface TestHarness {
  db: SqliteD1;
  app: Hono<AppEnv>;
  env: Bindings;
}

export function createHarness(environment = "test"): TestHarness {
  const db = new SqliteD1();
  return {
    db,
    app: createApp(),
    env: { DB: db.asD1Database(), ENV: environment },
  };
}

export interface SendOptions {
  method?: string;
  json?: unknown;
  form?: FormData;
  cookie?: string;
  rawBody?: string;
  /** Cloudflare が付与する接続元 IP（CF-Connecting-IP）。 */
  ip?: string;
}

export async function send(harness: TestHarness, path: string, options: SendOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
    body = options.rawBody;
  } else if (options.form !== undefined) {
    body = options.form;
  }
  if (options.cookie !== undefined) {
    headers["Cookie"] = options.cookie;
  }
  if (options.ip !== undefined) {
    headers["CF-Connecting-IP"] = options.ip;
  }
  return harness.app.request(
    path,
    { method: options.method ?? "GET", headers, body },
    harness.env,
  );
}

/** Set-Cookie から "session_id=..." の部分（Cookie ヘッダにそのまま使える形）を取り出す。 */
export function sessionCookieFrom(response: Response): string | undefined {
  const header = response.headers.get("set-cookie");
  if (header === null) return undefined;
  const match = /session_id=[^;]+/.exec(header);
  return match?.[0];
}
