"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintField = {
  label: string;
  value: string;
};

export function PrintReportItemButton({
  fields,
  subtitle,
  title
}: {
  fields: PrintField[];
  subtitle?: string;
  title: string;
}) {
  async function exportItemPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ format: "a4", unit: "pt" });
    const margin = 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 24;

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(doc.splitTextToSize(subtitle, maxWidth), margin, y);
      y += 24;
    }

    fields.forEach((field) => {
      const wrapped = doc.splitTextToSize(`${field.label}: ${field.value || "-"}`, maxWidth);
      if (y + wrapped.length * 14 > 780) {
        doc.addPage();
        y = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(field.label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(field.value || "-", maxWidth - 150), margin + 150, y);
      y += Math.max(20, wrapped.length * 14);
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Restaurant Brasil - gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 818);
    doc.save(`${safeFilename(title)}.pdf`);
  }

  function printItem() {
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            p { color: #475569; margin: 0 0 20px; }
            table { border-collapse: collapse; width: 100%; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; vertical-align: top; }
            td:first-child { color: #475569; font-weight: 700; width: 34%; }
            .footer { color: #64748b; font-size: 12px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          <table>
            <tbody>
              ${fields
                .map(
                  (field) =>
                    `<tr><td>${escapeHtml(field.label)}</td><td>${escapeHtml(field.value || "-")}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="footer">Restaurant Brasil - impressao individual do relatorio</div>
        </body>
      </html>`;

    const popup = window.open("", "_blank", "width=900,height=700");

    if (!popup) {
      window.print();
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button className="h-9 gap-2 px-3" type="button" variant="secondary" onClick={printItem}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
      <Button className="h-9 gap-2 px-3" type="button" variant="secondary" onClick={exportItemPdf}>
        <FileDown className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
