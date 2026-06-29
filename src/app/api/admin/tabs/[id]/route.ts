import { createItemHandlers } from "@/lib/api/admin";
import { updateTab } from "@/lib/services/master-data";
import { tabSchema } from "@/lib/validations/master-data";

export const { PATCH } = createItemHandlers({
  permission: "tabs.view",
  schema: tabSchema,
  update: updateTab
});
