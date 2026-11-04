import { createMiddleware } from "hono/factory";
import { ENVIRONMENTS, SESSION, SESSION_ISSUANCE } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { resolveEnvironment, type AppEnv } from "../env";
import { SessionRepository } from "../db/sessionRepository";
import { ApiError } from "../lib/errors";
import { createLogger, type Logger } from "../lib/logger";
import { utcIsoNow } from "../lib/time";

/** Cookie ヘッダから session_id の値（生のUUID）を取り出す。無ければ undefined。 */
export function parseSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined || cookieHeader.length === 0) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq) === SESSION.COOKIE_NAME) {
      const value = trimmed.slice(eq + 1);
      return value.length > 0 ? value : undefined;
    }
  }
  return undefined;
}

/** HttpOnly / SameSite=Lax（SPEC/api/auth.md）。本番のみ Secure を付ける。 */
export function buildSessionCookie(rawId: string, secure: boolean): string {
  const attributes = [
    `${SESSION.COOKIE_NAME}=${rawId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION.MAX_AGE_SECONDS}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

/** 任意の文字列を SHA-256 の 16 進文字列にする（生の値は保存しない）。 */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** UUID を SHA-256 でハッシュ化し、16 進文字列にする。DB にはこの値だけを保存する。 */
export async function hashSessionId(rawId: string): Promise<string> {
  return sha256Hex(rawId);
}

/** 固定ウィンドウの開始時刻（UNIX 秒）。 */
export function issuanceWindowStart(now: Date): number {
  const seconds = Math.floor(now.getTime() / 1000);
  return seconds - (seconds % SESSION_ISSUANCE.WINDOW_SECONDS);
}

export interface ResolvedSession {
  rawId: string;
  ownerKey: string;
  isNew: boolean;
}

/** 旧 SessionManager.validate_session / create_session の移植。 */
export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * 有効な Cookie があればそのセッションを返し、無い・期限切れ・未知の場合は新規発行する。
   * 新規発行は接続元 IP ごとに回数を制限する（超えたら 429）。
   */
  async resolve(cookieHeader: string | undefined, now: Date, clientIp: string): Promise<ResolvedSession> {
    const rawId = parseSessionCookie(cookieHeader);
    if (rawId === undefined) {
      this.logger.debug("session cookie missing; issuing a new session");
      return this.createSession(now, clientIp);
    }

    const ownerKey = await hashSessionId(rawId);
    const expiresAt = await this.repository.findExpiresAt(ownerKey);
    if (expiresAt === null) {
      this.logger.warn("session not found; issuing a new session", { ownerKey: ownerKey.slice(0, 8) });
      return this.createSession(now, clientIp);
    }
    if (now.getTime() > Date.parse(expiresAt)) {
      this.logger.warn("session expired; issuing a new session", { ownerKey: ownerKey.slice(0, 8) });
      return this.createSession(now, clientIp);
    }
    return { rawId, ownerKey, isNew: false };
  }

  private async createSession(now: Date, clientIp: string): Promise<ResolvedSession> {
    const clientKey = await sha256Hex(clientIp);
    const issued = await this.repository.incrementIssuance(clientKey, issuanceWindowStart(now));
    if (issued > SESSION_ISSUANCE.MAX_PER_WINDOW) {
      this.logger.warn("session issuance limit reached", { clientKey: clientKey.slice(0, 8), issued });
      throw new ApiError(429, MESSAGES.SESSION_RATE_LIMITED);
    }

    const rawId = crypto.randomUUID();
    const ownerKey = await hashSessionId(rawId);
    const expiresAt = new Date(now.getTime() + SESSION.EXPIRES_HOURS * 60 * 60 * 1000);
    await this.repository.insert(ownerKey, utcIsoNow(now), utcIsoNow(expiresAt));
    this.logger.info("new session created", { ownerKey: ownerKey.slice(0, 8) });
    return { rawId, ownerKey, isNew: true };
  }
}

/**
 * /api 配下のルートに付けるセッションミドルウェア。
 * 新規発行時のみ Set-Cookie を付与する（既存 Cookie は更新しない）。
 */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const environment = resolveEnvironment(c.env.ENV);
  const logger = createLogger("session", environment);
  const service = new SessionService(new SessionRepository(c.env.DB), logger);
  const clientIp = c.req.header(SESSION_ISSUANCE.CLIENT_IP_HEADER) ?? SESSION_ISSUANCE.UNKNOWN_CLIENT;
  const session = await service.resolve(c.req.header("Cookie"), new Date(), clientIp);

  c.set("ownerKey", session.ownerKey);
  if (session.isNew) {
    c.header("Set-Cookie", buildSessionCookie(session.rawId, environment === ENVIRONMENTS.PRODUCTION), {
      append: true,
    });
  }
  await next();
});
