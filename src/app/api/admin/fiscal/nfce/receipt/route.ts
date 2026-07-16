import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/admin";
import { requirePermission } from "@/lib/auth";
import { queryNfceReceiptHomologation } from "@/lib/services/fiscal";
import { nfceReceiptQuerySchema } from "@/lib/validations/fiscal";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("fiscal.manage");
    const body = await request.json();
    const parsed = nfceReceiptQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para consultar recibo NFC-e." },
        { status: 400 }
      );
    }

    const result = await queryNfceReceiptHomologation(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
