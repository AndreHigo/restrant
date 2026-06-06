import { createCollectionHandlers } from "@/lib/api/admin";
import { db } from "@/lib/db";
import { registerOrderPayments } from "@/lib/services/operations";
import { orderPaymentSchema } from "@/lib/validations/operations";

export const { GET, POST } = createCollectionHandlers({
  permission: "cash.manage",
  schema: orderPaymentSchema,
  list: async () =>
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    }),
  create: registerOrderPayments
});
