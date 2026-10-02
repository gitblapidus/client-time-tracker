import { NextResponse } from "next/server";
import { PROJECT_TYPE_LABELS, monthKey } from "@/lib/calculations";
import { jsonError, requireSession } from "@/lib/http";
import { parseListParam } from "@/lib/query-params";
import {
  buildBurnRateWorkbook,
  buildReportWorkbook,
  buildSowWorkbook,
  managedExportLine,
  managedHeaders,
  summaryExportLines,
  tmExportLine,
  tmHeaders,
    weeklyManagedHeaders,
    weeklyTmSpendHeaders,
    weeklyManagedTotalLine,
    weeklyTmSpendTotalLine,
} from "@/lib/report-excel";
import { formatMoney } from "@/lib/burn-rate";
import { partitionByProjectType } from "@/lib/time-hours";
import { formatHours, formatSignedHours } from "@/lib/utils";
import { sowProjectLabel, sowReportTotals } from "@/lib/sow-report";
import { reportQuerySchema } from "@/lib/validations";
import { buildBurnRateReport, buildReport, buildSowReport } from "@/services/time-service";

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
    if (reportType === "sow") {
      const { rows } = await buildSowReport(query);
      const filename = "sow-report";
      if (format === "csv") {
        const totals = sowReportTotals(rows);
        const csv = [
          ["Project", "Quoted Hours", "Development", "Delivery Lead", "Technical Leadership", "Total", "Remaining"].join(","),
          ...rows.map((row) =>
            [
              sowProjectLabel(row),
              formatHours(row.quotedHours),
              formatHours(row.developmentHours),
              formatHours(row.deliveryLeadHours),
              formatHours(row.technicalLeadershipHours),
              formatHours(row.hoursUsed),
              formatSignedHours(row.hoursRemaining),
            ]
              .map(csvEscape)
              .join(","),
          ),
          [
            "Total",
            formatHours(totals.quotedHours),
            formatHours(totals.developmentHours),
            formatHours(totals.deliveryLeadHours),
            formatHours(totals.technicalLeadershipHours),
            formatHours(totals.hoursUsed),
            formatSignedHours(totals.hoursRemaining),
          ]
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
      const workbook = buildSowWorkbook(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
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
    const managedLines = [
      ...managed.map((row) => managedExportLine(row, compact)),
      ...(compact && managed.length ? [weeklyManagedTotalLine(managed)] : []),
    ];
    const tmLines = [
      ...timeAndMaterials.map((row) => tmExportLine(row, compact, compact)),
      ...(compact && timeAndMaterials.length ? [weeklyTmSpendTotalLine(timeAndMaterials)] : []),
    ];
    const capitalLines = [
      ...capitalTimeAndMaterials.map((row) => tmExportLine(row, compact, compact)),
      ...(compact && capitalTimeAndMaterials.length ? [weeklyTmSpendTotalLine(capitalTimeAndMaterials)] : []),
    ];
    const summaryLines = summaryExportLines(report.summary);
    const managedColumnHeaders = compact ? weeklyManagedHeaders : managedHeaders;
    const tmColumnHeaders = compact ? weeklyTmSpendHeaders : tmHeaders;
    const capitalColumnHeaders = compact ? weeklyTmSpendHeaders : tmHeaders;
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
        capitalColumnHeaders.join(","),
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
