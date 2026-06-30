import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { updateScaleDevice } from "@/lib/services/scale";
import { scaleDeviceSchema } from "@/lib/validations/scale";

type ScaleDeviceRouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: ScaleDeviceRouteContext) {
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

    const updated = await updateScaleDevice(params.id, parsed.data, session.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
