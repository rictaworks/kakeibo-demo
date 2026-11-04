import { LOG_LEVELS, ENVIRONMENTS } from "../config/constants";
import type { RuntimeEnvironment } from "../env";

type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.ERROR]: 3,
};

/** 開発・テストは DEBUG まで出し、本番は INFO 以上のみ出す。 */
export function minimumLogLevel(environment: RuntimeEnvironment): LogLevel {
  return environment === ENVIRONMENTS.PRODUCTION ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
}

/** 機密値（セッションID等）はここへ渡す前にハッシュの先頭だけに切り詰めること。 */
export function createLogger(scope: string, environment: RuntimeEnvironment): Logger {
  const threshold = LEVEL_ORDER[minimumLogLevel(environment)];

  const emit = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (LEVEL_ORDER[level] < threshold) return;
    const suffix = context === undefined ? "" : ` ${JSON.stringify(context)}`;
    const line = `${level} ${scope}: ${message}${suffix}`;
    if (level === LOG_LEVELS.ERROR) {
      console.error(line);
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (message, context) => emit(LOG_LEVELS.DEBUG, message, context),
    info: (message, context) => emit(LOG_LEVELS.INFO, message, context),
    warn: (message, context) => emit(LOG_LEVELS.WARN, message, context),
    error: (message, context) => emit(LOG_LEVELS.ERROR, message, context),
  };
}
