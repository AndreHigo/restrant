import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { launchScaleSale } from "@/lib/services/operations";
import { scaleLaunchSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const body = await request.json();
    const parsed = scaleLaunchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para lancar a balanca." },
        { status: 400 }
      );
    }

    const launched = await launchScaleSale(parsed.data, session.sub, session.permissions);
    return NextResponse.json(launched, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
