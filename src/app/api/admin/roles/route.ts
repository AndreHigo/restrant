import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";

export async function GET() {
  try {
    await requirePermission("roles.view");

    const roles = await db.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(roles);
  } catch (error) {
    return handleApiError(error);
  }
}
