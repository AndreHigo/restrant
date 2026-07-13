import { requirePagePermission } from "@/lib/auth";
import { getOperationSettings } from "@/lib/services/operation-settings";
import { Badge } from "@/components/ui/badge";
import { OperationSettingsForm } from "@/components/admin/operation-settings-form";

export default async function AdminOperationSettingsPage() {
  await requirePagePermission("settings.view");
  const settings = await getOperationSettings();
  const enabledCount = [
    settings.enableBuffetKg,
    settings.enablePratoFeito,
    settings.enableKitchen,
    settings.enableCounter,
    settings.enableTakeout,
    settings.enableDelivery,
    settings.enableTableService
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Modos de operacao do restaurante</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Defina se o restaurante opera com buffet por quilo, prato feito, cozinha por setor, balcao,
              retirada, delivery ou atendimento por mesa. Essas opcoes vao orientar as proximas telas operacionais.
            </p>
          </div>
          <Badge tone="success">{enabledCount} modo{enabledCount === 1 ? "" : "s"} ativo{enabledCount === 1 ? "" : "s"}</Badge>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Habilitar fluxos</h3>
          <p className="mt-1 text-sm text-slate-500">
            Use isso para simplificar o sistema conforme o restaurante: so quilo, PF/marmita, cozinha completa ou canais mistos.
          </p>
        </div>
        <div className="p-6">
          <OperationSettingsForm settings={settings} />
        </div>
      </section>
    </div>
  );
}
