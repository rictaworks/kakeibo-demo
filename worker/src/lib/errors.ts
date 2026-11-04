/** 1 項目分の入力エラー（FastAPI の 422 detail 形式に合わせる）。 */
export interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

/**
 * API の HTTP エラー。detail は文字列（400/404 など）か、入力エラーの配列（422）。
 * レスポンスは { detail } の形で返す（frontend/lib/api.ts が body.detail を読む）。
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string | ValidationIssue[],
  ) {
    super(typeof detail === "string" ? detail : "validation failed");
    this.name = "ApiError";
  }
}

export function validationError(issues: ValidationIssue[]): ApiError {
  return new ApiError(422, issues);
}
