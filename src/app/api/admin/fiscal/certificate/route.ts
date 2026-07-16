import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { handleApiError } from "@/lib/api/admin";
import { saveFiscalCertificate } from "@/lib/fiscal-secrets";
import { updateFiscalCertificate } from "@/lib/services/fiscal";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("fiscal.manage");
    const formData = await request.formData();
    const file = formData.get("certificate");
    const password = String(formData.get("password") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie o arquivo do certificado A1." }, { status: 400 });
    }

    if (!password.trim()) {
      return NextResponse.json({ error: "Informe a senha do certificado A1." }, { status: 400 });
    }

    const saved = await saveFiscalCertificate(file);
    const result = await updateFiscalCertificate(
      {
        fileName: saved.fileName,
        password,
        path: saved.path
      },
      session.sub
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
