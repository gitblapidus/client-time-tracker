import { NextResponse } from "next/server";
import { monthKey } from "@/lib/calculations";
import { jsonError, requireSession } from "@/lib/http";
import { parseListParam } from "@/lib/query-params";
import { reportQuerySchema } from "@/lib/validations";
import { buildBurnRateReport, buildReport } from "@/services/time-service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const query = reportQuerySchema.parse({
      clientIds: parseListParam(searchParams, "clientId"),
      projectIds: parseListParam(searchParams, "projectId"),
      productionManagers: parseListParam(searchParams, "productionManager"),
      startYear: searchParams.get("startYear"),
      startMonth: searchParams.get("startMonth"),
      endYear: searchParams.get("endYear"),
      endMonth: searchParams.get("endMonth"),
    });
    if (monthKey(query.startYear, query.startMonth) > monthKey(query.endYear, query.endMonth)) {
      return NextResponse.json({ error: "Start month must be on or before end month." }, { status: 400 });
    }
    if (searchParams.get("reportType") === "burn-rate") {
      const burnRate = await buildBurnRateReport(query);
      return NextResponse.json({
        rows: [],
        summary: {
          totalAvailableHours: 0,
          totalUsedHours: 0,
          totalRemainingHours: 0,
          averageMonthlyUsage: 0,
          utilizationPercent: 0,
        },
        burnRate,
      });
    }
    const report = await buildReport(query);
    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
