import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { reviewCancellationRequest } from "@/lib/services/operations";
import { cancellationReviewSchema } from "@/lib/validations/operations";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("cash.cancel");
    const body = await request.json();
    const parsed = cancellationReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos para revisar cancelamento." },
        { status: 400 }
      );
    }

    const result = await reviewCancellationRequest(parsed.data, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
