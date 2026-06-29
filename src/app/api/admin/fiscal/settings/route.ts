import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateCompanyFiscalSettings } from "@/lib/services/fiscal";
import { companyFiscalSettingsSchema } from "@/lib/validations/fiscal";

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("fiscal.manage");
    const body = await request.json();
    const parsed = companyFiscalSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados fiscais invalidos." },
        { status: 400 }
      );
    }

    const updated = await updateCompanyFiscalSettings(parsed.data, session.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
