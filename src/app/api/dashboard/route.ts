import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/http";
import { isValidYearMonth } from "@/lib/months";
import { getDashboard } from "@/services/time-service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!isValidYearMonth(year, month)) {
      return NextResponse.json({ error: "A valid month and year are required." }, { status: 400 });
    }
    const data = await getDashboard(year, month);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
