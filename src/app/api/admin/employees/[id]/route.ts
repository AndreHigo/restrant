import { createItemHandlers } from "@/lib/api/admin";
import { updateEmployee } from "@/lib/services/master-data";
import { employeeSchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "employees.view",
  schema: employeeSchema,
  update: updateEmployee
});
