import { readdirSync, readFileSync } from "fs";
import { join, normalize, relative, resolve } from "path";

const apiRoot = resolve("src/app/api");

const publicRoutes = new Set(
  [
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/forgot-password/route.ts",
    "src/app/api/auth/reset-password/route.ts",
    "src/app/api/auth/logout/route.ts"
  ].map((item) => normalize(item))
);

const acceptedGuardTokens = [
  "requirePermission",
  "requireSession",
  "getSession",
  "createCollectionHandlers",
  "createItemHandlers",
  "logout("
];

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

const routes = walk(apiRoot)
  .filter((file) => file.endsWith("route.ts"))
  .map((file) => {
    const content = readFileSync(file, "utf8");
    const relativePath = normalize(relative(process.cwd(), file));
    const isPublic = publicRoutes.has(relativePath);
    const guard = acceptedGuardTokens.find((token) => content.includes(token));

    return {
      guard: guard ?? "",
      isPublic,
      ok: isPublic || Boolean(guard),
      route: relativePath
    };
  });

const unguardedRoutes = routes.filter((route) => !route.ok);
const guardedRoutes = routes.filter((route) => route.ok && !route.isPublic);

console.table([
  { check: "rotas API analisadas", ok: routes.length > 0, status: routes.length },
  { check: "rotas privadas com guarda", ok: guardedRoutes.length > 0, status: guardedRoutes.length },
  { check: "rotas privadas sem guarda", ok: unguardedRoutes.length === 0, status: unguardedRoutes.length },
  { check: "rotas publicas declaradas", ok: publicRoutes.size === 4, status: publicRoutes.size }
]);

if (unguardedRoutes.length > 0) {
  console.table(unguardedRoutes);
  throw new Error("Existem rotas privadas sem guarda de autenticacao/permissao.");
}

console.log("Auditoria estatica de RBAC das APIs aprovada.");
