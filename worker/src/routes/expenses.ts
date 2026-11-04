import { Hono } from "hono";
import { MESSAGES } from "../config/messages";
import { ExpenseRepository } from "../db/expenseRepository";
import type { AppEnv } from "../env";
import { ApiError, validationError } from "../lib/errors";
import { utcIsoNow } from "../lib/time";
import { parseExpenseInput, parseExpenseUpdate, parsePathId } from "../lib/validation";
import { sessionMiddleware } from "../session/session";
import { loggerFor, readJsonObject } from "./common";

/** /api/expenses（旧 backend/routers/expenses.py）。全ルートがセッションのオーナーキーで絞り込まれる。 */
export function createExpenseRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  routes.use("*", sessionMiddleware);

  routes.post("/", async (c) => {
    const parsed = parseExpenseInput(await readJsonObject(c));
    if (!parsed.ok) throw validationError(parsed.issues);

    const ownerKey = c.get("ownerKey");
    const createdAt = utcIsoNow(new Date());
    const id = await new ExpenseRepository(c.env.DB).insert(ownerKey, parsed.value, createdAt);
    loggerFor(c, "expenses").info("expense created", { id, ownerKey: ownerKey.slice(0, 8) });
    return c.json({ id, created_at: createdAt });
  });

  routes.get("/", async (c) => {
    const rows = await new ExpenseRepository(c.env.DB).listBySession(c.get("ownerKey"));
    return c.json(rows);
  });

  routes.put("/:id", async (c) => {
    const pathId = parsePathId(c.req.param("id"));
    if (!pathId.ok) throw validationError(pathId.issues);
    const parsed = parseExpenseUpdate(await readJsonObject(c));
    if (!parsed.ok) throw validationError(parsed.issues);

    const ownerKey = c.get("ownerKey");
    const repository = new ExpenseRepository(c.env.DB);
    const id = pathId.value;
    if (!(await repository.existsForSession(id, ownerKey))) {
      throw new ApiError(404, MESSAGES.EXPENSE_NOT_FOUND);
    }
    if (Object.keys(parsed.value).length === 0) {
      throw new ApiError(400, MESSAGES.UPDATE_FIELDS_MISSING);
    }

    await repository.update(id, ownerKey, parsed.value, utcIsoNow(new Date()));
    loggerFor(c, "expenses").info("expense updated", { id, ownerKey: ownerKey.slice(0, 8) });
    return c.json({ id, updated: true });
  });

  routes.delete("/:id", async (c) => {
    const pathId = parsePathId(c.req.param("id"));
    if (!pathId.ok) throw validationError(pathId.issues);

    const ownerKey = c.get("ownerKey");
    const repository = new ExpenseRepository(c.env.DB);
    const id = pathId.value;
    if (!(await repository.existsForSession(id, ownerKey))) {
      throw new ApiError(404, MESSAGES.EXPENSE_NOT_FOUND);
    }

    await repository.delete(id, ownerKey);
    loggerFor(c, "expenses").info("expense deleted", { id, ownerKey: ownerKey.slice(0, 8) });
    return c.json({ id, deleted: true });
  });

  return routes;
}
