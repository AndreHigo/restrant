import { createCollectionHandlers } from "@/lib/api/admin";
import { customerSchema } from "@/lib/validations/master-data";
import { createCustomer, listCustomers } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "customers.view",
  schema: customerSchema,
  list: listCustomers,
  create: createCustomer
});
