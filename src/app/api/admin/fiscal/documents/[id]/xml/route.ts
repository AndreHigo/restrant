import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api/admin";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requirePermission("fiscal.view");

    const document = await db.fiscalDocument.findUnique({
      where: {
        id: params.id
      },
      select: {
        number: true,
        series: true,
        xmlContent: true
      }
    });

    if (!document?.xmlContent) {
      return NextResponse.json({ error: "XML fiscal nao encontrado." }, { status: 404 });
    }

    const fileName = `nfce-${document.series ?? "1"}-${document.number ?? "sem-numero"}.xml`;

    return new NextResponse(document.xmlContent, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/xml; charset=utf-8"
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
