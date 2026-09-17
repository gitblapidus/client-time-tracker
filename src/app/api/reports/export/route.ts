import { NextResponse } from "next/server";
import { PROJECT_TYPE_LABELS, monthKey } from "@/lib/calculations";
import { jsonError, requireSession } from "@/lib/http";
import { parseListParam } from "@/lib/query-params";
import {
  buildBurnRateWorkbook,
  buildReportWorkbook,
  managedExportLine,
  managedHeaders,
  summaryExportLines,
  tmExportLine,
  tmHeaders,
  weeklyManagedHeaders,
  weeklyTmHeaders,
} from "@/lib/report-excel";
import { formatMoney } from "@/lib/burn-rate";
import { partitionByProjectType } from "@/lib/time-hours";
import { formatHours } from "@/lib/utils";
import { reportQuerySchema } from "@/lib/validations";
import { buildBurnRateReport, buildReport } from "@/services/time-service";

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
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
    const reportType = searchParams.get("reportType");
    if (reportType === "burn-rate") {
      const { projects, totals } = await buildBurnRateReport(query);
      const filename = "burn-rate-report";
      if (format === "csv") {
        const csv = [
          ["Project", "Subtitle", "Client", "Ticket", "Status", "Estimate (Hr)", "Estimate (cost)", "Actual", "Actual (Spend)", "Remaining (Hr)", "Remaining (Spend)"].join(","),
          ...projects.flatMap((project) =>
            [
              { ticket: "Total", status: project.total.status, ...project.total },
              project.pm,
              project.dev,
            ].map((line) =>
              [
                project.title,
                project.subtitle ?? "",
                project.clientName,
                line.ticket,
                line.ticket === "Total" ? line.status : "",
                formatHours(line.estimateHours),
                formatMoney(line.estimateCost, project.currency),
                formatHours(line.actualHours),
                formatMoney(line.actualSpend, project.currency),
                formatHours(line.remainingHours),
                formatMoney(line.remainingSpend, project.currency),
              ]
                .map(csvEscape)
                .join(","),
            ),
          ),
          "",
          ["Totals", "", "", "", "", formatHours(totals.estimateHours), formatMoney(totals.estimateCost, totals.currency), formatHours(totals.actualHours), formatMoney(totals.actualSpend, totals.currency), formatHours(totals.remainingHours), formatMoney(totals.remainingSpend, totals.currency)]
            .map(csvEscape)
            .join(","),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
          },
        });
      }
      const workbook = buildBurnRateWorkbook(projects, totals);
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
    const compact = reportType === "weekly-status";
    const report = await buildReport(query);
    const { managed, timeAndMaterials, capitalTimeAndMaterials } = partitionByProjectType(report.rows);
    const managedLines = managed.map((row) => managedExportLine(row, compact));
    const tmLines = timeAndMaterials.map((row) => tmExportLine(row, compact));
    const capitalLines = capitalTimeAndMaterials.map((row) => tmExportLine(row, compact));
    const summaryLines = summaryExportLines(report.summary);
    const managedColumnHeaders = compact ? weeklyManagedHeaders : managedHeaders;
    const tmColumnHeaders = compact ? weeklyTmHeaders : tmHeaders;
    const filename = compact ? "weekly-status-report" : "hourline-report";

    if (format === "csv") {
      const csv = [
        "Managed Service",
        managedColumnHeaders.join(","),
        ...managedLines.map((line) => line.map(csvEscape).join(",")),
        "",
        "Time & Materials",
        tmColumnHeaders.join(","),
        ...tmLines.map((line) => line.map(csvEscape).join(",")),
        "",
        PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS,
        tmColumnHeaders.join(","),
        ...capitalLines.map((line) => line.map(csvEscape).join(",")),
        "",
        ...summaryLines.map((line) => line.map(csvEscape).join(",")),
      ].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const workbook = buildReportWorkbook({
      managed,
      timeAndMaterials,
      capitalTimeAndMaterials,
      summary: report.summary,
      compact,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
