import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { jsonError, requireSession } from "@/lib/http";
import { formatYearMonth } from "@/lib/months";
import { formatHours } from "@/lib/utils";
import { getClient } from "@/services/client-service";
import { buildReport } from "@/services/time-service";
import { buildFinanceMailto } from "@/services/user-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const body = (await request.json()) as {
      startYear?: number;
      startMonth?: number;
      endYear?: number;
      endMonth?: number;
    };
    const client = await getClient(id);
    if (client.financeEmails.length === 0) {
      throw new AppError("Add at least one client finance email before sending a time summary.");
    }
    const startYear = body.startYear ?? new Date().getFullYear();
    const startMonth = body.startMonth ?? new Date().getMonth() + 1;
    const endYear = body.endYear ?? startYear;
    const endMonth = body.endMonth ?? startMonth;
    const report = await buildReport({
      clientIds: [id],
      startYear,
      startMonth,
      endYear,
      endMonth,
    });
    const periodLabel =
      startYear === endYear && startMonth === endMonth
        ? formatYearMonth(startYear, startMonth)
        : `${formatYearMonth(startYear, startMonth)} – ${formatYearMonth(endYear, endMonth)}`;
    const mailto = buildFinanceMailto({
      to: client.financeEmails,
      clientName: client.name,
      periodLabel,
      summaryLines: [
        `Total available hours: ${formatHours(report.summary.totalAvailableHours)}`,
        `Total used hours: ${formatHours(report.summary.totalUsedHours)}`,
        `Total remaining hours: ${formatHours(report.summary.totalRemainingHours)}`,
        `Utilization: ${formatHours(report.summary.utilizationPercent)}%`,
        ``,
        `This mailto-based send can later be replaced with SendGrid, Microsoft Graph, or another provider without changing the administration UI.`,
      ],
    });
    return NextResponse.json({ mailto, provider: "mailto" });
  } catch (error) {
    return jsonError(error);
  }
}
