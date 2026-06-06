import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  if (!session.permissions.includes("roles.view")) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

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
}
