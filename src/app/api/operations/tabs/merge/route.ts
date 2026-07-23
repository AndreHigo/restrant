import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { mergeOperationalTabs } from "@/lib/services/operations";
import { tabMergeSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.merge_tabs");
    const body = await request.json();
    const parsed = tabMergeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para unir comandas." },
        { status: 400 }
      );
    }

    const result = await mergeOperationalTabs(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
