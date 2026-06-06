import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScaleLaunchForm } from "@/components/operations/scale-launch-form";

export default async function OperationScalePage() {
  await requirePagePermission("sales.manage");
  const [products, tables, tabs, devices, readings] = await Promise.all([
    db.product.findMany({
      where: { active: true, type: "WEIGHABLE" },
      orderBy: { name: "asc" }
    }),
    db.restaurantTable.findMany({
      where: { active: true },
      orderBy: { code: "asc" }
    }),
    db.tab.findMany({
      where: { active: true },
      orderBy: { openedAt: "desc" }
    }),
    db.scaleDevice.findMany({
      where: { active: true },
      orderBy: { name: "asc" }
    }),
    db.scaleReading.findMany({
      include: {
        product: true,
        scaleDevice: true
      },
      orderBy: { readAt: "desc" },
      take: 12
    })
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Lancamento direto da balanca</h3>
          <p className="mt-1 text-sm text-slate-500">
            Capture o peso e jogue o item direto em mesa, comanda ou balcao.
          </p>
        </div>
        <div className="mt-6">
          <ScaleLaunchForm
            products={products.map((product) => ({
              id: product.id,
              label: `${product.name} - ${Number(product.pricePerKg ?? product.price).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}/kg`,
              pricePerKg: Number(product.pricePerKg ?? product.price)
            }))}
            scaleDevices={devices.map((device) => ({ label: device.name, value: device.id }))}
            tables={tables.map((table) => ({ label: table.name, value: table.id }))}
            tabs={tabs.map((tab) => ({ label: tab.number, value: tab.id }))}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Leituras recentes</h3>
          <p className="mt-1 text-sm text-slate-500">
            Historico operacional das ultimas pesagens registradas.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {readings.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">Nenhuma leitura registrada ainda.</div>
          ) : (
            readings.map((reading) => (
              <div key={reading.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{reading.product?.name ?? "Produto pesavel"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {reading.scaleDevice?.name ?? "Leitura manual"} - {reading.source}
                    </p>
                    {reading.notes && <p className="mt-2 text-sm text-slate-600">{reading.notes}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900">
                      {Number(reading.weightKg).toLocaleString("pt-BR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3
                      })}{" "}
                      kg
                    </p>
                    <p className="mt-1 text-slate-500">
                      {Number(reading.totalPrice ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
