import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  if (!session.permissions.includes("roles.view")) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const permissions = await db.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }]
  });

  return NextResponse.json(permissions);
}
