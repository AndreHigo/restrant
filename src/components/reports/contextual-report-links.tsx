"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Download, FileText } from "lucide-react";

type ContextualReportLink = {
  title: string;
  description: string;
  href: Route;
  exportHref?: Route;
  exportLabel?: string;
};

type ContextualReportLinksProps = {
  title: string;
  description: string;
  links: ContextualReportLink[];
};

export function ContextualReportLinks({ title, description, links }: ContextualReportLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <div key={link.title} className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-950">{link.title}</p>
            <p className="mt-1 min-h-[40px] text-sm leading-5 text-slate-500">{link.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition hover:bg-brand-700"
                href={link.href}
              >
                Abrir
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {link.exportHref ? (
                <Link
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  href={link.exportHref}
                >
                  {link.exportLabel ?? "CSV"}
                  <Download className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
