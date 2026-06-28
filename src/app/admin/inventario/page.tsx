import { requirePagePermission } from "@/lib/auth";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { listStockOverview } from "@/lib/services/stock";

export default async function InventoryPage() {
  await requirePagePermission("stock.view");
  const overview = await listStockOverview();

  return <InventoryManager overview={overview} />;
}
