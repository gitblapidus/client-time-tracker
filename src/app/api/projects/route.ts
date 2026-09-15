import { NextResponse } from "next/server";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { parseActiveParam, parseListParam } from "@/lib/query-params";
import { projectSchema } from "@/lib/validations";
import { createProject, listAssignedProductionManagerNames, listProjects } from "@/services/project-service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const types = parseListParam(searchParams, "type");
    const [projects, productionManagers] = await Promise.all([
      listProjects({
        search: searchParams.get("search") ?? undefined,
        active: parseActiveParam(searchParams),
        types: types.length ? types : undefined,
        clientIds: parseListParam(searchParams, "clientId"),
        productionManagers: parseListParam(searchParams, "productionManager"),
      }),
      listAssignedProductionManagerNames(),
    ]);
    return NextResponse.json({ projects, productionManagers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = projectSchema.parse(await request.json());
    const project = await createProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
