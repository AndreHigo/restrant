import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { captureScaleReading } from "@/lib/services/operations";
import { scaleReadingCreateSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("sales.manage");
    const body = await request.json();
    const parsed = scaleReadingCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para leitura da balanca." },
        { status: 400 }
      );
    }

    if (parsed.data.sourceMode === "MANUAL" && !session.permissions.includes("sales.manual_weight")) {
      throw new Error("FORBIDDEN");
    }

    const reading = await captureScaleReading(parsed.data, session.sub, session.permissions);
    return NextResponse.json(reading, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
