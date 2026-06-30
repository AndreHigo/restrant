"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReportPdfField = {
  label: string;
  value: string;
};

export type ReportPdfRow = {
  fields: ReportPdfField[];
  title: string;
};

type ExportReportPdfButtonProps = {
  filename: string;
  rows: ReportPdfRow[];
  summary?: ReportPdfField[];
  subtitle?: string;
  title: string;
};

export function ExportReportPdfButton({ filename, rows, summary = [], subtitle, title }: ExportReportPdfButtonProps) {
  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ format: "a4", unit: "pt" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    function ensureSpace(height = 36) {
      if (y + height <= pageHeight - margin) {
        return;
      }

      doc.addPage();
      y = margin;
    }

    function line(text: string, size = 10, color: [number, number, number] = [15, 23, 42], style: "normal" | "bold" = "normal") {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const wrapped = doc.splitTextToSize(text || "-", maxWidth);
      ensureSpace(wrapped.length * (size + 3));
      doc.text(wrapped, margin, y);
      y += wrapped.length * (size + 3);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 24;

    if (subtitle) {
      line(subtitle, 10, [71, 85, 105]);
      y += 8;
    }

    if (summary.length > 0) {
      line("Resumo", 12, [15, 23, 42], "bold");
      y += 4;
      summary.forEach((field) => line(`${field.label}: ${field.value || "-"}`, 10, [51, 65, 85]));
      y += 12;
    }

    line("Registros", 12, [15, 23, 42], "bold");
    y += 6;

    if (rows.length === 0) {
      line("Nenhum registro encontrado para os filtros informados.", 10, [71, 85, 105]);
    }

    rows.forEach((row, index) => {
      ensureSpace(90);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      line(`${index + 1}. ${row.title}`, 11, [15, 23, 42], "bold");
      row.fields.forEach((field) => line(`${field.label}: ${field.value || "-"}`, 9, [51, 65, 85]));
      y += 8;
    });

    ensureSpace(28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Restaurant Brasil - gerado em ${new Date().toLocaleString("pt-BR")}`, margin, pageHeight - 24);
    doc.save(safeFilename(filename));
  }

  return (
    <Button className="h-10 gap-2 px-4" type="button" variant="secondary" onClick={exportPdf}>
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}

function safeFilename(filename: string) {
  const normalized = filename
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.endsWith(".pdf") ? normalized : `${normalized || "relatorio"}.pdf`;
}
