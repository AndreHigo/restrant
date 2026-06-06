import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function UsersPage() {
  await requirePagePermission("users.view");
  const users = await db.user.findMany({
    include: {
      role: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-950">Usuarios e perfis</h3>
        <p className="mt-1 text-sm text-slate-500">
          Base inicial para gestao de contas, papeis e permissao por modulo.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Nome</th>
              <th className="px-6 py-3 font-medium">E-mail</th>
              <th className="px-6 py-3 font-medium">Perfil</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Ultimo login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                <td className="px-6 py-4 text-slate-600">{user.role.name}</td>
                <td className="px-6 py-4">
                  <Badge tone={user.status === "ACTIVE" ? "success" : "warning"}>
                    {user.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {user.lastLoginAt ? user.lastLoginAt.toLocaleString("pt-BR") : "Nunca"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
