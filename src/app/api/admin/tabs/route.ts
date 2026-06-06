import { createCollectionHandlers } from "@/lib/api/admin";
import { tabSchema } from "@/lib/validations/master-data";
import { createTab, listTabs } from "@/lib/services/master-data";

export const { GET, POST } = createCollectionHandlers({
  permission: "tabs.view",
  schema: tabSchema,
  list: listTabs,
  create: createTab
});
