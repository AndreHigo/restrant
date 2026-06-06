export const modules = [
  "dashboard",
  "users",
  "roles",
  "products",
  "stock",
  "sales",
  "cash",
  "financial",
  "fiscal",
  "settings",
  "audit",
  "scale"
] as const;

export type AppModule = (typeof modules)[number];

export type PermissionKey = `${AppModule}.${"view" | "create" | "update" | "delete" | "manage"}`;

export function hasPermission(permissionKeys: string[], required: string) {
  return permissionKeys.includes(required);
}
