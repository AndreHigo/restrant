"use client";

import { Printer } from "lucide-react";
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
    <Button className="h-9 gap-2 px-3" type="button" variant="secondary" onClick={printItem}>
      <Printer className="h-4 w-4" />
      Imprimir
    </Button>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
