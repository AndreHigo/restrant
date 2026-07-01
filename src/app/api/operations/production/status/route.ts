import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateProductionItemStatus } from "@/lib/services/operations";
import { productionItemStatusSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.view");
    const body = await request.json();
    const parsed = productionItemStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para atualizar producao." },
        { status: 400 }
      );
    }

    const result = await updateProductionItemStatus(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
