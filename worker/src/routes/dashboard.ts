import { Hono } from "hono";
import { MESSAGES } from "../config/messages";
import { DashboardRepository } from "../db/dashboardRepository";
import type { AppEnv } from "../env";
import { ApiError, validationError, type ValidationIssue } from "../lib/errors";
import { jstYearMonth } from "../lib/time";
import { isMonthInRange, isYearInRange, parseIntegerQuery } from "../lib/validation";
import { DashboardService } from "../services/dashboardService";
import { sessionMiddleware } from "../session/session";
import { loggerFor } from "./common";

/** /api/dashboard（旧 backend/routers/dashboard.py）。年・月は省略時に JST の当月。 */
export function createDashboardRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  routes.use("*", sessionMiddleware);

  routes.get("/", async (c) => {
    const now = new Date();
    const yearQuery = parseIntegerQuery("year", c.req.query("year"));
    const monthQuery = parseIntegerQuery("month", c.req.query("month"));
    const issues: ValidationIssue[] = [
      ...(yearQuery.ok ? [] : yearQuery.issues),
      ...(monthQuery.ok ? [] : monthQuery.issues),
    ];
    if (issues.length > 0) throw validationError(issues);

    const current = jstYearMonth(now);
    const year = yearQuery.ok && yearQuery.value !== undefined ? yearQuery.value : current.year;
    const month = monthQuery.ok && monthQuery.value !== undefined ? monthQuery.value : current.month;
    if (!isMonthInRange(month)) throw new ApiError(400, MESSAGES.MONTH_RANGE);
    if (!isYearInRange(year)) throw new ApiError(400, MESSAGES.YEAR_RANGE);

    const ownerKey = c.get("ownerKey");
    const data = await new DashboardService(new DashboardRepository(c.env.DB)).build(ownerKey, year, month, now);
    loggerFor(c, "dashboard").info("dashboard fetched", { ownerKey: ownerKey.slice(0, 8), year, month });
    return c.json(data);
  });

  return routes;
}
