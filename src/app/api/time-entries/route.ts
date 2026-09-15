import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/http";
import { isValidYearMonth } from "@/lib/months";
import { timeEntryBulkSchema } from "@/lib/validations";
import { listTimeEntryRows, saveTimeEntries } from "@/services/time-service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!isValidYearMonth(year, month)) {
      return NextResponse.json({ error: "A valid month and year are required." }, { status: 400 });
    }
    const rows = await listTimeEntryRows(year, month);
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const input = timeEntryBulkSchema.parse(await request.json());
    await saveTimeEntries(session.user.id, input);
    const rows = await listTimeEntryRows(input.year, input.month);
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
