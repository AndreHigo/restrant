"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { z } from "zod";

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Nao foi possivel fazer login.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as {
      redirectTo?: "/admin" | "/operacao";
    };
    router.push((payload.redirectTo ?? "/admin") as Route);
    router.refresh();
  });

  return (
    <form action="/api/auth/login" className="space-y-4" method="post" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Usuario</label>
        <Input type="text" placeholder="caixa01 ou admin@restaurante.local" {...register("email")} />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
        <Input type="password" placeholder="Sua senha" {...register("password")} />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Entrando..." : "Acessar sistema"}
      </Button>

      <Link className="block text-center text-sm font-medium text-brand-800" href="/recuperar-senha">
        Esqueci minha senha
      </Link>
    </form>
  );
}
