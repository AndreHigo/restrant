import { createCollectionHandlers } from "@/lib/api/admin";
import { stockMovementSchema } from "@/lib/validations/stock";
import { createStockMovement } from "@/lib/services/stock";
import { db } from "@/lib/db";

export const { GET, POST } = createCollectionHandlers({
  permission: "stock.view",
  schema: stockMovementSchema,
  list: async () =>
    db.stockMovement.findMany({
      include: {
        ingredient: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 30
    }),
  create: createStockMovement
});
