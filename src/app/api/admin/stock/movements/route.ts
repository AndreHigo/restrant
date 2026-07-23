import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { createStockMovement } from "@/lib/services/stock";
import { stockMovementSchema } from "@/lib/validations/stock";

export async function GET() {
  try {
    await requirePermission("stock.view");
    const movements = await db.stockMovement.findMany({
      include: { ingredient: true },
      orderBy: { createdAt: "desc" },
      take: 30
    });
    return NextResponse.json(movements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("stock.adjust");
    const parsed = stockMovementSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para movimentacao." },
        { status: 400 }
      );
    }

    return NextResponse.json(await createStockMovement(parsed.data, session.sub), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
