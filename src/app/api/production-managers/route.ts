import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/http";
import { listProductionManagerNames } from "@/services/project-service";

export async function GET() {
  try {
    await requireSession();
    const productionManagers = await listProductionManagerNames();
    return NextResponse.json({ productionManagers });
  } catch (error) {
    return jsonError(error);
  }
}
