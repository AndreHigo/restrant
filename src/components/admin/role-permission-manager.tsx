"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionItem, RolePermissionItem } from "@/lib/services/roles";

type PermissionGroup = {
  module: string;
  permissions: PermissionItem[];
};

function groupPermissions(permissions: PermissionItem[]): PermissionGroup[] {
  const grouped = new Map<string, PermissionItem[]>();

  for (const permission of permissions) {
    const items = grouped.get(permission.module) ?? [];
    items.push(permission);
    grouped.set(permission.module, items);
  }

  return Array.from(grouped.entries()).map(([module, items]) => ({
    module,
    permissions: items
  }));
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    create: "Criar",
    delete: "Inativar",
    manage: "Gerenciar",
    update: "Editar",
    view: "Visualizar"
  };

  return labels[action] ?? action;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function RolePermissionManager({
  permissions,
  roles
}: {
  permissions: PermissionItem[];
  roles: RolePermissionItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const editableRoles = roles.filter((role) => role.name !== "administrador");
  const [selectedRoleId, setSelectedRoleId] = useState(editableRoles[0]?.id ?? roles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(selectedRole?.permissionIds ?? [])
  );
  const [itemDiscountLimitPercent, setItemDiscountLimitPercent] = useState(
    selectedRole?.itemDiscountLimitPercent?.toString() ?? ""
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const permissionGroups = useMemo(() => {
    const text = normalize(query);
    const filtered = text
      ? permissions.filter((permission) =>
          [permission.module, permission.action, permission.label, permission.key].some((value) =>
            normalize(value).includes(text)
          )
        )
      : permissions;

    return groupPermissions(filtered);
  }, [permissions, query]);

  const summary = useMemo(
    () => ({
      totalRoles: roles.length,
      totalPermissions: permissions.length,
      editableRoles: editableRoles.length,
      selectedCount: selectedPermissions.size
    }),
    [editableRoles.length, permissions.length, roles.length, selectedPermissions.size]
  );

  function selectRole(role: RolePermissionItem) {
    setSelectedRoleId(role.id);
    setSelectedPermissions(new Set(role.permissionIds));
    setItemDiscountLimitPercent(role.itemDiscountLimitPercent?.toString() ?? "");
    setError("");
    setSuccess("");
  }

  function togglePermission(permissionId: string) {
    if (!selectedRole || selectedRole.name === "administrador") {
      return;
    }

    setSelectedPermissions((current) => {
      const next = new Set(current);

      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }

      return next;
    });
  }

  function toggleModule(group: PermissionGroup, checked: boolean) {
    if (!selectedRole || selectedRole.name === "administrador") {
      return;
    }

    setSelectedPermissions((current) => {
      const next = new Set(current);

      for (const permission of group.permissions) {
        if (checked) {
          next.add(permission.id);
        } else {
          next.delete(permission.id);
        }
      }

      return next;
    });
  }

  function savePermissions() {
    if (!selectedRole) {
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          permissionIds: Array.from(selectedPermissions)
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel salvar as permissoes.");
        return;
      }

      setSuccess("Permissoes atualizadas com auditoria.");
      router.refresh();
    });
  }

  function saveItemDiscountLimit() {
    if (!selectedRole) {
      return;
    }

    const trimmedValue = itemDiscountLimitPercent.trim();
    const limit = trimmedValue === "" ? null : Number(trimmedValue);

    if (limit !== null && (!Number.isFinite(limit) || limit < 0 || limit > 100)) {
      setError("Informe um limite entre 0 e 100% ou deixe em branco para nao limitar.");
      return;
    }

    setError("");
    setSuccess("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/item-discount-limit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemDiscountLimitPercent: limit })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel salvar o limite de desconto.");
        return;
      }

      setSuccess("Limite de desconto atualizado com auditoria.");
      router.refresh();
    });
  }

  const selectedIsProtected = selectedRole?.name === "administrador";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Perfis e permissoes</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Controle quais modulos e acoes cada papel pode acessar. Menus e rotas usam estas
              permissoes em tempo real no login e na validacao de servidor.
            </p>
          </div>
          <Badge tone="success">RBAC</Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Perfis</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.totalRoles}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Editaveis</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.editableRoles}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Permissoes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.totalPermissions}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Selecionadas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.selectedCount}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h4 className="text-base font-semibold text-slate-950">Papel do usuario</h4>
            <p className="mt-1 text-sm text-slate-500">Selecione um perfil para revisar acessos.</p>
          </div>
          <div className="space-y-2 p-4">
            {roles.map((role) => (
              <button
                key={role.id}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedRole?.id === role.id
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                type="button"
                onClick={() => selectRole(role)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-950">{role.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{role.description}</p>
                  </div>
                  {role.name === "administrador" ? <Badge tone="warning">Protegido</Badge> : null}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {role.usersCount} usuario{role.usersCount === 1 ? "" : "s"} |{" "}
                  {role.permissionIds.length} permissoes
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-base font-semibold capitalize text-slate-950">
                  {selectedRole?.name ?? "Perfil"}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedIsProtected
                    ? "Administrador e protegido para evitar perda acidental de acesso total."
                    : "Marque as permissoes liberadas para este papel."}
                </p>
              </div>
              <Button
                className="gap-2"
                disabled={isPending || selectedIsProtected}
                type="button"
                onClick={savePermissions}
              >
                <Check className="h-4 w-4" />
                Salvar permissoes
              </Button>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
          </div>

          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-slate-900">Limite de desconto por item</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Deixe em branco para nao limitar. Descontos acima do teto exigem a permissao de excecao.
              </p>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Percentual maximo
              <Input
                className="mt-1"
                disabled={isPending || selectedIsProtected}
                inputMode="decimal"
                max="100"
                min="0"
                placeholder="Sem limite"
                step="0.01"
                type="number"
                value={itemDiscountLimitPercent}
                onChange={(event) => setItemDiscountLimitPercent(event.target.value)}
              />
            </label>
            <Button
              disabled={isPending || selectedIsProtected}
              type="button"
              variant="secondary"
              onClick={saveItemDiscountLimit}
            >
              Salvar limite
            </Button>
          </div>

          <div className="border-b border-slate-200 p-5">
            <label className="text-sm font-medium text-slate-700" htmlFor="permission-search">
              Buscar permissao
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="permission-search"
                className="pl-9"
                placeholder="Modulo, acao ou codigo da permissao"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 p-5">
            {permissionGroups.map((group) => {
              const checkedCount = group.permissions.filter((permission) =>
                selectedPermissions.has(permission.id)
              ).length;
              const allChecked = checkedCount === group.permissions.length;

              return (
                <div key={group.module} className="rounded-lg border border-slate-200">
                  <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{group.module}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {checkedCount} de {group.permissions.length} permissoes selecionadas
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        checked={allChecked}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        disabled={selectedIsProtected}
                        type="checkbox"
                        onChange={(event) => toggleModule(group, event.target.checked)}
                      />
                      Selecionar modulo
                    </label>
                  </div>
                  <div className="grid gap-2 p-4 md:grid-cols-2 2xl:grid-cols-3">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          checked={selectedPermissions.has(permission.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          disabled={selectedIsProtected}
                          type="checkbox"
                          onChange={() => togglePermission(permission.id)}
                        />
                        <span>
                          <span className="block font-medium text-slate-950">
                            {actionLabel(permission.action)}
                          </span>
                          <span className="block text-xs text-slate-500">{permission.key}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
