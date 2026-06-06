import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  if (!session.permissions.includes("users.view")) {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const users = await db.user.findMany({
    include: {
      role: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json(users);
}
