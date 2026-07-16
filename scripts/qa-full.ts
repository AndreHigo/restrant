import { spawn, spawnSync, type ChildProcess } from "node:child_process";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3100";
const port = new URL(baseUrl).port || "3100";

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} falhou com codigo ${result.status ?? "desconhecido"}${
        result.error ? `: ${result.error.message}` : ""
      }.`
    );
  }
}

function runNpmScript(script: string, env: NodeJS.ProcessEnv = process.env) {
  if (process.platform === "win32") {
    run("cmd.exe", ["/c", "npm", "run", script], env);
    return;
  }

  run("npm", ["run", script], env);
}

function startNextServer() {
  const serverEnv = {
    ...process.env,
    PASSWORD_RESET_DEBUG: "true"
  };

  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/c", "npx", "next", "start", "-p", port], {
      env: serverEnv,
      stdio: ["ignore", "pipe", "pipe"]
    });
  }

  return spawn("npx", ["next", "start", "-p", port], {
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function stopServer(server: ChildProcess) {
  if (!server.pid || server.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    return;
  }

  server.kill("SIGTERM");
}

async function waitForServer() {
  const startedAt = Date.now();
  const timeoutMs = 30_000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) {
        return;
      }
    } catch {
      // O servidor ainda esta subindo.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Servidor de QA nao respondeu em ${baseUrl}.`);
}

async function main() {
  console.log("1/14 Build de producao");
  runNpmScript("build");

  console.log(`2/14 Subindo servidor temporario em ${baseUrl}`);
  const server = startNextServer();

  server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer();

    const testEnv = {
      ...process.env,
      SMOKE_BASE_URL: baseUrl
    };

    console.log("3/14 Smoke test das rotas criticas");
    runNpmScript("test:smoke", testEnv);

    console.log("4/14 Smoke test do fluxo operacional");
    runNpmScript("test:flow", testEnv);

    console.log("5/14 Smoke test de atendimento rapido de balcao");
    runNpmScript("test:counter", testEnv);

    console.log("6/14 Smoke test de bloqueios por modos operacionais");
    runNpmScript("test:operation-modes", testEnv);

    console.log("7/14 Smoke test de bloqueio de peso manual por permissao");
    runNpmScript("test:manual-weight", testEnv);

    console.log("8/14 Smoke test de captura automatica de peso estavel");
    runNpmScript("test:scale-stable", testEnv);

    console.log("9/14 Smoke test de bloqueio de venda sem estoque");
    runNpmScript("test:stock-block", testEnv);

    console.log("10/14 Smoke test de auditoria de estoque");
    runNpmScript("test:stock-audit", testEnv);

    console.log("11/14 Smoke test de cancelamento auditado de compra");
    runNpmScript("test:purchase-cancel", testEnv);

    console.log("12/14 Smoke test de aprovacao de cancelamento");
    runNpmScript("test:cancellation-approval", testEnv);

    console.log("13/14 Smoke test de permissoes e bloqueios RBAC");
    runNpmScript("test:rbac", testEnv);

    console.log("14/14 Simulacao completa de restaurante");
    runNpmScript("test:scenario", testEnv);

    console.log("QA completo aprovado.");
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
