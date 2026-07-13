import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateOperationSettings } from "@/lib/services/operation-settings";
import { operationSettingsSchema } from "@/lib/validations/operation-settings";

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("settings.update");
    const body = await request.json();
    const parsed = operationSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Configuracao operacional invalida." },
        { status: 400 }
      );
    }

    const updated = await updateOperationSettings(parsed.data, session.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
