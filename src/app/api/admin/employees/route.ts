import { createCollectionHandlers } from "@/lib/api/admin";
import { employeeSchema } from "@/lib/validations/master-data";
import { createEmployee, listEmployees } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "employees.view",
  schema: employeeSchema,
  list: listEmployees,
  create: createEmployee
});
