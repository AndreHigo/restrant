import { createItemHandlers } from "@/lib/api/admin";
import { updateCustomer } from "@/lib/services/master-data";
import { customerSchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "customers.view",
  schema: customerSchema,
  update: updateCustomer
});
