import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { checkNfceStatusService } from "@/lib/services/fiscal";
import { nfceStatusCheckSchema } from "@/lib/validations/fiscal";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("fiscal.manage");
    const body = await request.json().catch(() => ({}));
    const parsed = nfceStatusCheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos para consulta de status." }, { status: 400 });
    }

    const result = await checkNfceStatusService(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
