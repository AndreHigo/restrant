import { createItemHandlers } from "@/lib/api/admin";
import { updatePaymentMethod } from "@/lib/services/master-data";
import { paymentMethodSchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "payment_methods.view",
  schema: paymentMethodSchema,
  update: updatePaymentMethod
});
