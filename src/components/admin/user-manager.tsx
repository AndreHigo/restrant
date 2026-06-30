"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RoleOption = {
  id: string;
  name: string;
  description: string;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: string;
  statusLabel: string;
  mustResetPassword: boolean;
  lastLoginAt: string;
};

type FormState = {
  name: string;
  email: string;
  roleId: string;
  status: string;
  password: string;
};

function initialFormState(roles: RoleOption[]): FormState {
  return {
    name: "",
    email: "",
    roleId: roles[0]?.id ?? "",
    status: "ACTIVE",
    password: ""
  };
}

function formatDateTime(value: string) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "ACTIVE") {
    return "success";
  }

  if (status === "BLOCKED") {
    return "warning";
  }

  return "default";
}

export function UserManager({ roles, users }: { roles: RoleOption[]; users: UserItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [form, setForm] = useState<FormState>(initialFormState(roles));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.roleName, user.statusLabel].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [query, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "ACTIVE").length,
      blocked: users.filter((user) => user.status === "BLOCKED").length,
      reset: users.filter((user) => user.mustResetPassword).length
    }),
    [users]
  );

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(user: UserItem) {
    setError("");
    setSuccess("");
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      status: user.status,
      password: ""
    });
  }

  function cancelEdit() {
    setError("");
    setSuccess("");
    setEditingUserId("");
    setForm(initialFormState(roles));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = editingUserId
      ? {
          name: form.name,
          email: form.email,
          roleId: form.roleId,
          status: form.status
        }
      : form;

    const response = await fetch(editingUserId ? `/api/admin/users/${editingUserId}` : "/api/admin/users", {
      method: editingUserId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Nao foi possivel salvar o usuario.");
      return;
    }

    setSuccess(editingUserId ? "Usuario atualizado." : "Usuario criado com senha temporaria.");
    setEditingUserId("");
    setForm(initialFormState(roles));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Usuarios</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Ativos</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">{summary.active}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Bloqueados</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{summary.blocked}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Troca de senha</p>
          <p className="mt-3 text-3xl font-semibold text-brand-700">{summary.reset}</p>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Usuarios e perfis</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crie, edite, bloqueie e organize acessos por perfil.
                </p>
              </div>
              <label className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar usuario"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Ultimo login</th>
                  <th className="px-6 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      {user.mustResetPassword && (
                        <p className="mt-1 text-xs font-medium text-amber-700">Senha temporaria</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">{user.roleName}</td>
                    <td className="px-6 py-4">
                      <Badge tone={statusTone(user.status)}>{user.statusLabel}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(user.lastLoginAt)}</td>
                    <td className="px-6 py-4">
                      <Button className="h-9 px-3" type="button" variant="secondary" onClick={() => startEdit(user)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={6}>
                      Nenhum usuario encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {editingUserId ? "Editar usuario" : "Novo usuario"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {editingUserId
                  ? "Atualize perfil e status sem apagar o historico."
                  : "Crie acesso com senha temporaria e troca obrigatoria futura."}
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Nome
              <Input className="mt-2" required value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Usuario
              <Input
                className="mt-2"
                required
                type="text"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Perfil
              <select
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                required
                value={form.roleId}
                onChange={(event) => updateField("roleId", event.target.value)}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Status
              <select
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
            </label>
            {!editingUserId && (
              <label className="block text-sm font-medium text-slate-700">
                Senha temporaria
                <Input
                  className="mt-2"
                  minLength={8}
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                />
              </label>
            )}

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

            <Button className="h-12 w-full" disabled={isPending} type="submit">
              {isPending ? "Salvando..." : editingUserId ? "Atualizar usuario" : "Criar usuario"}
            </Button>
            {editingUserId && (
              <Button className="h-11 w-full" type="button" variant="secondary" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancelar edicao
              </Button>
            )}
          </form>
        </aside>
      </section>
    </div>
  );
}
