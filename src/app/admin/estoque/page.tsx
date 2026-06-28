import { requirePagePermission } from "@/lib/auth";
import { StockManager } from "@/components/admin/stock-manager";
import { listStockOverview } from "@/lib/services/stock";

export default async function AdminStockPage() {
  await requirePagePermission("stock.view");
  const overview = await listStockOverview();

  return <StockManager overview={overview} />;
}
