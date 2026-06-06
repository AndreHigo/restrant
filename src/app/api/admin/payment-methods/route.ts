import { createCollectionHandlers } from "@/lib/api/admin";
import { paymentMethodSchema } from "@/lib/validations/master-data";
import { createPaymentMethod, listPaymentMethods } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "payment_methods.view",
  schema: paymentMethodSchema,
  list: listPaymentMethods,
  create: createPaymentMethod
});
