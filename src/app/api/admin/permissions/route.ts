import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";

export async function GET() {
  try {
    await requirePermission("roles.view");

    const permissions = await db.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }]
    });

    return NextResponse.json(permissions);
  } catch (error) {
    return handleApiError(error);
  }
}
