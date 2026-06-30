import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { createScaleDevice } from "@/lib/services/scale";
import { scaleDeviceSchema } from "@/lib/validations/scale";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("scale.manage");
    const body = await request.json();
    const parsed = scaleDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para a balanca." },
        { status: 400 }
      );
    }

    const created = await createScaleDevice(parsed.data, session.sub);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
