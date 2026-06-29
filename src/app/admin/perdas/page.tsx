import { requirePagePermission } from "@/lib/auth";
import { LossManager } from "@/components/admin/loss-manager";
import { listLossOverview } from "@/lib/services/stock";

export default async function LossesPage() {
  await requirePagePermission("stock.view");
  const overview = await listLossOverview();

  return <LossManager overview={overview} />;
}
