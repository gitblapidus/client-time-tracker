import { NextResponse } from "next/server";
import { monthKey } from "@/lib/calculations";
import { jsonError, requireSession } from "@/lib/http";
import { parseListParam } from "@/lib/query-params";
import {
  buildReportWorkbook,
  managedExportLine,
  managedHeaders,
  summaryExportLines,
  tmExportLine,
  tmHeaders,
} from "@/lib/report-excel";
import { partitionByProjectType } from "@/lib/time-hours";
import { reportQuerySchema } from "@/lib/validations";
import { buildReport } from "@/services/time-service";

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
    const report = await buildReport(query);
    const { managed, timeAndMaterials } = partitionByProjectType(report.rows);
    const managedLines = managed.map(managedExportLine);
    const tmLines = timeAndMaterials.map(tmExportLine);
    const summaryLines = summaryExportLines(report.summary);

    if (format === "csv") {
      const csv = [
        "Managed Service",
        managedHeaders.join(","),
        ...managedLines.map((line) => line.map(csvEscape).join(",")),
        "",
        "Time & Materials",
        tmHeaders.join(","),
        ...tmLines.map((line) => line.map(csvEscape).join(",")),
        "",
        ...summaryLines.map((line) => line.map(csvEscape).join(",")),
      ].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="hourline-report.csv"',
        },
      });
    }

    const workbook = buildReportWorkbook({
      managed,
      timeAndMaterials,
      summary: report.summary,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="hourline-report.xlsx"',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
