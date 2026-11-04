import { ENVIRONMENTS } from "./config/constants";

export type RuntimeEnvironment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

/** wrangler.jsonc の bindings と vars。 */
export interface Bindings {
  DB: D1Database;
  ENV?: string;
}

/** セッションミドルウェアが設定する値。ownerKey は expenses.session_id に入るハッシュ化済みキー。 */
export interface SessionVariables {
  ownerKey: string;
}

export type AppEnv = { Bindings: Bindings; Variables: SessionVariables };

const KNOWN_ENVIRONMENTS: readonly string[] = Object.values(ENVIRONMENTS);

/**
 * 環境判定（development / test / production）。未設定や未知の値は例外にする。
 * フォールバック禁止のルールに従い、既定値へ黙って切り替えない。
 */
export function resolveEnvironment(raw: string | undefined): RuntimeEnvironment {
  if (raw === undefined || !KNOWN_ENVIRONMENTS.includes(raw)) {
    throw new Error(`ENV binding is missing or unknown: ${raw ?? "(unset)"}`);
  }
  return raw as RuntimeEnvironment;
}
