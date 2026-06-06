import { createCollectionHandlers } from "@/lib/api/admin";
import { inventoryAdjustmentSchema } from "@/lib/validations/stock";
import { applyInventoryAdjustment } from "@/lib/services/stock";

export const { POST } = createCollectionHandlers({
  permission: "stock.view",
  schema: inventoryAdjustmentSchema,
  list: async () => [],
  create: applyInventoryAdjustment
});
