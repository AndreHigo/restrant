"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function FloatingBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const hasSidePanel =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/operacao") ||
    pathname.startsWith("/perfil");

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <button
      aria-label="Voltar para a pagina anterior"
      className={cn(
        "fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-[calc(env(safe-area-inset-left)+16px)] z-50 inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200",
        hasSidePanel && "lg:left-[336px]"
      )}
      type="button"
      onClick={handleBack}
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );
}
