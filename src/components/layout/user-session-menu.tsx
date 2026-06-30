"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type UserSessionMenuProps = {
  user: {
    email: string;
    name: string;
    role: string;
  };
};

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function UserSessionMenu({ user }: UserSessionMenuProps) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-w-[260px] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:min-w-[320px]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-brand-700">{roleLabel(user.role)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          href="/perfil"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Preferencias
        </Link>
        <Button className="h-10 gap-2 px-3" type="button" variant="secondary" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
