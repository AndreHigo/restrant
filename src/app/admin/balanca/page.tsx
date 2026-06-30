import { requirePagePermission } from "@/lib/auth";
import { listScaleAdminDashboard } from "@/lib/services/scale";
import { Badge } from "@/components/ui/badge";
import { ScaleDeviceForm } from "@/components/admin/scale-device-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminScalePage() {
  await requirePagePermission("scale.view");
  const dashboard = await listScaleAdminDashboard();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Dispositivos</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{dashboard.kpis.devicesCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Ativos</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">{dashboard.kpis.activeDevicesCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Leituras</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{dashboard.kpis.totalReadings}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Fallback manual</p>
          <p className="mt-3 text-2xl font-semibold text-amber-700">{dashboard.kpis.manualReadings}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Dispositivos de balanca</h3>
            <p className="mt-1 text-sm text-slate-500">
              Cadastro preparado para conexao serial, USB, API e operacao manual auditada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Balanca</th>
                  <th className="px-6 py-3 font-medium">Conexao</th>
                  <th className="px-6 py-3 font-medium">Porta/API</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.devices.map((device) => (
                  <tr key={device.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{device.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{device.identifier}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {device.connectionLabel}
                      {device.baudRate ? <span className="block text-xs text-slate-500">{device.baudRate} bps</span> : null}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{device.endpoint || device.port || "-"}</td>
                    <td className="px-6 py-4">
                      <Badge tone={device.active ? "success" : "default"}>{device.active ? "Ativa" : "Inativa"}</Badge>
                    </td>
                  </tr>
                ))}
                {dashboard.devices.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={4}>
                      Nenhuma balanca cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-950">Nova balanca</h3>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre o dispositivo antes de usar a leitura no pedido ou no lancamento direto por comanda.
          </p>
          <div className="mt-6">
            <ScaleDeviceForm devices={dashboard.devices} />
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Leituras recentes</h3>
          <p className="mt-1 text-sm text-slate-500">
            Historico das capturas usadas em pedidos, com fallback manual separado para conferencia.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Origem</th>
                <th className="px-6 py-3 font-medium">Produto</th>
                <th className="px-6 py-3 font-medium">Peso</th>
                <th className="px-6 py-3 font-medium">Valor</th>
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.readings.map((reading) => (
                <tr key={reading.id} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{reading.deviceName}</p>
                    <p className="mt-1 text-xs text-slate-500">{reading.source}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{reading.productName || "-"}</td>
                  <td className="px-6 py-4 text-slate-600">{reading.weight.toFixed(3)} kg</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(reading.totalPrice)}</td>
                  <td className="px-6 py-4 text-slate-600">{reading.userName}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(reading.createdAt)}</td>
                </tr>
              ))}
              {dashboard.readings.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={6}>
                    Nenhuma leitura registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
