import { afterEach, describe, expect, it } from "vitest";
import worker from "../../src/index";
import { MESSAGES } from "../../src/config/messages";
import { createHarness, send, sessionCookieFrom, type TestHarness } from "../support/app";

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

let harness: TestHarness | undefined;

function setup(environment = "test"): TestHarness {
  harness = createHarness(environment);
  return harness;
}

afterEach(() => {
  harness?.db.close();
  harness = undefined;
});

/** セッションを作るために 1 件登録し、その Cookie と ID を返す。 */
async function createExpenseWithNewSession(
  h: TestHarness,
  body: Record<string, unknown>,
): Promise<{ cookie: string; id: number }> {
  const response = await send(h, "/api/expenses", { method: "POST", json: body });
  expect(response.status).toBe(200);
  const cookie = sessionCookieFrom(response);
  if (cookie === undefined) throw new Error("session cookie was not issued");
  const json = (await response.json()) as { id: number };
  return { cookie, id: json.id };
}

describe("ヘルスチェック", () => {
  it("GET /health は ok を返す", async () => {
    const h = setup();
    const response = await send(h, "/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});

describe("セッション（Cookie の自動発行）", () => {
  it("Cookie が無ければ発行し、HttpOnly・SameSite=Lax・Max-Age を付ける（開発では Secure なし）", async () => {
    const h = setup("development");
    const response = await send(h, "/api/expenses");
    expect(response.status).toBe(200);
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/^session_id=[0-9a-f-]{36}/);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Max-Age=86400");
    expect(header).not.toContain("Secure");
  });

  it("本番（ENV=production）では Secure を付ける", async () => {
    const h = setup("production");
    const response = await send(h, "/api/expenses");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("既存の有効な Cookie では Set-Cookie を返さない", async () => {
    const h = setup();
    const { cookie } = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 100, category_id: 1 });
    const response = await send(h, "/api/expenses", { cookie });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("存在しない ID の Cookie は無視して新しいセッションを発行する", async () => {
    const h = setup();
    const response = await send(h, "/api/expenses", { cookie: "session_id=00000000-0000-4000-8000-000000000000" });
    expect(sessionCookieFrom(response)).toBeDefined();
    expect(sessionCookieFrom(response)).not.toBe("session_id=00000000-0000-4000-8000-000000000000");
  });

  it("有効期限切れのセッションは無効として扱う", async () => {
    const h = setup();
    const { cookie } = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 100, category_id: 1 });
    h.db.exec("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000+00:00'");
    const response = await send(h, "/api/expenses", { cookie });
    expect(sessionCookieFrom(response)).toBeDefined();
    expect(await response.json()).toEqual([]);
  });
});

describe("支出 CRUD（SPEC/api/transactions.md）", () => {
  it("作成・一覧・更新・削除の一連の流れ", async () => {
    const h = setup();
    const created = await createExpenseWithNewSession(h, {
      date: "2026-05-31",
      amount: 1200,
      category_id: 1,
      store_name: "イオン 渋谷店",
      memo: "週の買い物",
    });

    const list = await send(h, "/api/expenses", { cookie: created.cookie });
    const rows = (await list.json()) as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      date: "2026-05-31",
      amount: 1200,
      category_id: 1,
      category_name: "食料品",
      category_icon: "fa-solid fa-basket-shopping",
      store_name: "イオン 渋谷店",
      memo: "週の買い物",
    });

    const updated = await send(h, `/api/expenses/${created.id}`, {
      method: "PUT",
      json: { amount: 1500, category_id: 2 },
      cookie: created.cookie,
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ id: created.id, updated: true });

    const afterUpdate = (await (await send(h, "/api/expenses", { cookie: created.cookie })).json()) as {
      amount: number;
      category_name: string;
    }[];
    expect(afterUpdate[0]).toMatchObject({ amount: 1500, category_name: "外食" });

    const deleted = await send(h, `/api/expenses/${created.id}`, { method: "DELETE", cookie: created.cookie });
    expect(await deleted.json()).toEqual({ id: created.id, deleted: true });
    expect(await (await send(h, "/api/expenses", { cookie: created.cookie })).json()).toEqual([]);
  });

  it("日付形式・金額・カテゴリの不正は 422 で詳細を返す", async () => {
    const h = setup();
    const response = await send(h, "/api/expenses", {
      method: "POST",
      json: { date: "2026/05/31", amount: 0, category_id: 9 },
    });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { detail: { loc: string[]; msg: string }[] };
    expect(body.detail.map((item) => item.loc)).toEqual([
      ["body", "date"],
      ["body", "amount"],
      ["body", "category_id"],
    ]);
    expect(body.detail[0]?.msg).toBe(MESSAGES.DATE_FORMAT);
  });

  it("JSON でない本文は 422", async () => {
    const h = setup();
    const response = await send(h, "/api/expenses", { method: "POST", rawBody: "{not json" });
    expect(response.status).toBe(422);
  });

  it("更新項目が空なら 400、存在しない ID は 404", async () => {
    const h = setup();
    const created = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 100, category_id: 1 });

    const empty = await send(h, `/api/expenses/${created.id}`, { method: "PUT", json: {}, cookie: created.cookie });
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ detail: MESSAGES.UPDATE_FIELDS_MISSING });

    const missing = await send(h, "/api/expenses/999999", {
      method: "PUT",
      json: { amount: 10 },
      cookie: created.cookie,
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ detail: MESSAGES.EXPENSE_NOT_FOUND });
  });

  it("他セッションの支出は参照・更新・削除できない（オーナーキーで隔離）", async () => {
    const h = setup();
    const owner = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 100, category_id: 1 });
    const other = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 200, category_id: 2 });

    const ownerList = (await (await send(h, "/api/expenses", { cookie: owner.cookie })).json()) as { id: number }[];
    expect(ownerList.map((row) => row.id)).toEqual([owner.id]);

    const update = await send(h, `/api/expenses/${owner.id}`, {
      method: "PUT",
      json: { amount: 999 },
      cookie: other.cookie,
    });
    expect(update.status).toBe(404);

    const remove = await send(h, `/api/expenses/${owner.id}`, { method: "DELETE", cookie: other.cookie });
    expect(remove.status).toBe(404);

    const stillThere = (await (await send(h, "/api/expenses", { cookie: owner.cookie })).json()) as { amount: number }[];
    expect(stillThere[0]?.amount).toBe(100);
  });

  it("パス ID が整数でなければ 422", async () => {
    const h = setup();
    const response = await send(h, "/api/expenses/abc", { method: "DELETE" });
    expect(response.status).toBe(422);
  });
});

describe("ダッシュボード（SPEC/api/dashboard.md）", () => {
  it("月別・カテゴリ別・日別の集計と節約提案を返す", async () => {
    const h = setup();
    const first = await createExpenseWithNewSession(h, {
      date: "2026-05-10",
      amount: 35000,
      category_id: 2,
      store_name: "マクドナルド",
    });
    await send(h, "/api/expenses", {
      method: "POST",
      json: { date: "2026-05-11", amount: 1200, category_id: 1 },
      cookie: first.cookie,
    });

    const response = await send(h, "/api/dashboard?year=2026&month=5", { cookie: first.cookie });
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      monthly_totals: { year: number; month: number; total: number }[];
      category_totals: { category_id: number; total: number; count: number }[];
      daily_series: { date: string; total: number }[];
      suggestions: { rule: string; message: string }[];
    };

    expect(data.monthly_totals).toEqual([{ year: 2026, month: 5, total: 36200 }]);
    expect(data.category_totals).toHaveLength(8);
    expect(data.category_totals[0]).toMatchObject({ category_id: 2, total: 35000, count: 1 });
    expect(data.daily_series).toEqual([
      { date: "2026-05-10", total: 35000 },
      { date: "2026-05-11", total: 1200 },
    ]);
    expect(data.suggestions[0]).toMatchObject({
      rule: "dining",
      message: "今月の外食費が35,000円です。自炊を増やすと節約できます。",
    });
  });

  it("他セッションの支出は集計に含まれない", async () => {
    const h = setup();
    await createExpenseWithNewSession(h, { date: "2026-05-10", amount: 5000, category_id: 1 });
    const stranger = await createExpenseWithNewSession(h, { date: "2026-05-10", amount: 100, category_id: 1 });
    const data = (await (await send(h, "/api/dashboard?year=2026&month=5", { cookie: stranger.cookie })).json()) as {
      monthly_totals: { total: number }[];
    };
    expect(data.monthly_totals).toEqual([{ year: 2026, month: 5, total: 100 }]);
  });

  it("月・年の範囲外は 400、非整数は 422", async () => {
    const h = setup();
    const badMonth = await send(h, "/api/dashboard?year=2026&month=13");
    expect(badMonth.status).toBe(400);
    expect(await badMonth.json()).toEqual({ detail: MESSAGES.MONTH_RANGE });

    const badYear = await send(h, "/api/dashboard?year=1999&month=5");
    expect(badYear.status).toBe(400);
    expect(await badYear.json()).toEqual({ detail: MESSAGES.YEAR_RANGE });

    const notInteger = await send(h, "/api/dashboard?year=abc");
    expect(notInteger.status).toBe(422);
  });
});

describe("レシートアップロード（入口の検証のみ。OCR は Containers 側）", () => {
  function receiptForm(file: File | null, honeypot: string): FormData {
    const form = new FormData();
    if (file !== null) form.append("image", file);
    form.append("honeypot", honeypot);
    return form;
  }

  it("ハニーポットが埋まっていれば 400", async () => {
    const h = setup();
    const file = new File([new Uint8Array(PNG_BYTES)], "r.png", { type: "image/png" });
    const response = await send(h, "/api/receipts/upload", {
      method: "POST",
      form: receiptForm(file, "bot"),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ detail: MESSAGES.HONEYPOT_DETECTED });
  });

  it("検証を通った画像は 501（OCR 未移行）", async () => {
    const h = setup();
    const file = new File([new Uint8Array(PNG_BYTES)], "r.png", { type: "image/png" });
    const response = await send(h, "/api/receipts/upload", {
      method: "POST",
      form: receiptForm(file, ""),
    });
    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({ detail: MESSAGES.OCR_NOT_AVAILABLE });
  });

  it("未対応の形式は 400、画像が無ければ 422", async () => {
    const h = setup();
    const gif = new File([new Uint8Array(PNG_BYTES)], "r.gif", { type: "image/gif" });
    const badType = await send(h, "/api/receipts/upload", { method: "POST", form: receiptForm(gif, "") });
    expect(badType.status).toBe(400);
    expect(await badType.json()).toEqual({ detail: MESSAGES.UNSUPPORTED_FILE_TYPE });

    const missing = await send(h, "/api/receipts/upload", { method: "POST", form: receiptForm(null, "") });
    expect(missing.status).toBe(422);
  });

  it("宣言サイズが上限を大きく超えるリクエストは本文を読まずに 400", async () => {
    const h = setup();
    const oversized = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    const response = await send(h, "/api/receipts/upload", { method: "POST", form: receiptForm(oversized, "") });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ detail: MESSAGES.FILE_TOO_LARGE });
  });
});

describe("日次リセット（JST 03:00・scheduled ハンドラ）", () => {
  it("sessions と expenses を消し、categories は残す。古い Cookie は新規セッションになる", async () => {
    const h = setup();
    const created = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 100, category_id: 1 });

    const env = h.env;
    await worker.scheduled({} as ScheduledController, env, {} as ExecutionContext);

    const after = await send(h, "/api/expenses", { cookie: created.cookie });
    expect(after.status).toBe(200);
    expect(sessionCookieFrom(after)).toBeDefined();
    expect(await after.json()).toEqual([]);

    const categories = await h.db.prepare("SELECT COUNT(*) AS n FROM categories").first<{ n: number }>();
    expect(categories?.n).toBe(8);
  });
});

describe("受信本文の逐次チェック（Content-Length が無い場合も上限で止める）", () => {
  it("上限を超えた時点で読み取りを止め、全件は読まない", async () => {
    const h = setup();
    const chunkSize = 64 * 1024;
    const totalChunks = 96; // 6MB 相当
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= totalChunks) {
          controller.close();
          return;
        }
        pulled += 1;
        controller.enqueue(new Uint8Array(chunkSize));
      },
    });
    const request = new Request("http://localhost/api/receipts/upload", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=----kakeibo" },
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await h.app.request(request, undefined, h.env);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ detail: MESSAGES.FILE_TOO_LARGE });
    expect(pulled).toBeLessThan(totalChunks);
  });
});

describe("セッション発行の回数制限（Cookie なしのリクエスト）", () => {
  it("接続元 IP ごとに 30 件まで発行し、超えたら 429（他の IP は影響を受けない）", async () => {
    const h = setup();
    for (let index = 0; index < 30; index += 1) {
      const response = await send(h, "/api/expenses", { ip: "203.0.113.5" });
      expect(response.status).toBe(200);
    }

    const limited = await send(h, "/api/expenses", { ip: "203.0.113.5" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("set-cookie")).toBeNull();
    expect(await limited.json()).toEqual({ detail: MESSAGES.SESSION_RATE_LIMITED });

    const otherClient = await send(h, "/api/expenses", { ip: "198.51.100.7" });
    expect(otherClient.status).toBe(200);
  });

  it("既存の Cookie を持つリクエストは発行回数に数えない", async () => {
    const h = setup();
    const created = await createExpenseWithNewSession(h, { date: "2026-05-31", amount: 100, category_id: 1 });
    for (let index = 0; index < 40; index += 1) {
      const response = await send(h, "/api/expenses", { cookie: created.cookie, ip: "203.0.113.9" });
      expect(response.status).toBe(200);
    }
  });

  it("日次リセットで発行回数の記録も消える", async () => {
    const h = setup();
    for (let index = 0; index < 30; index += 1) {
      await send(h, "/api/expenses", { ip: "203.0.113.5" });
    }
    await worker.scheduled({} as ScheduledController, h.env, {} as ExecutionContext);
    const response = await send(h, "/api/expenses", { ip: "203.0.113.5" });
    expect(response.status).toBe(200);
  });
});

describe("金額の上限", () => {
  it("1,000 万円を超える金額は 422", async () => {
    const h = setup();
    const response = await send(h, "/api/expenses", {
      method: "POST",
      json: { date: "2026-05-31", amount: 10_000_001, category_id: 1 },
    });
    expect(response.status).toBe(422);
  });
});

describe("未定義のルート", () => {
  it("/api 配下の未定義パスは 404 を detail 形式で返す", async () => {
    const h = setup();
    const response = await send(h, "/api/unknown");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ detail: MESSAGES.NOT_FOUND });
  });
});
