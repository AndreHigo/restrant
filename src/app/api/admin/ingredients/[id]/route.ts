import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateIngredient } from "@/lib/services/master-data";
import { ingredientSchema } from "@/lib/validations/master-data";

type IngredientRouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: IngredientRouteContext) {
  try {
    const session = await requirePermission("ingredients.manage");
    const body = await request.json();
    const parsed = ingredientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 }
      );
    }

    const updated = await updateIngredient(params.id, parsed.data, session.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
