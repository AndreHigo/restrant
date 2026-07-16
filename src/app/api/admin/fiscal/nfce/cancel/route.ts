import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { cancelNfceHomologation } from "@/lib/services/fiscal";
import { nfceCancelSchema } from "@/lib/validations/fiscal";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("fiscal.manage");
    const body = await request.json();
    const parsed = nfceCancelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para cancelar NFC-e." },
        { status: 400 }
      );
    }

    const result = await cancelNfceHomologation(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
