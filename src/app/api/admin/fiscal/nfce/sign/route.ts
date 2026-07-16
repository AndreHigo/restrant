import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { signNfceHomologationXml } from "@/lib/services/fiscal";
import { nfceSignSchema } from "@/lib/validations/fiscal";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("fiscal.manage");
    const body = await request.json();
    const parsed = nfceSignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para assinar NFC-e." },
        { status: 400 }
      );
    }

    const result = await signNfceHomologationXml(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
