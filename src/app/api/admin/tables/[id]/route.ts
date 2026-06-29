import { createItemHandlers } from "@/lib/api/admin";
import { updateTable } from "@/lib/services/master-data";
import { tableSchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "tables.view",
  schema: tableSchema,
  update: updateTable
});
