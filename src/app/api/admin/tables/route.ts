import { createCollectionHandlers } from "@/lib/api/admin";
import { tableSchema } from "@/lib/validations/master-data";
import { createTable, listTables } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "tables.view",
  schema: tableSchema,
  list: listTables,
  create: createTable
});
