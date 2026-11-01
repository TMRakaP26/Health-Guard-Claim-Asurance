import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
const temporary = mkdtempSync(join(tmpdir(), "healthguard-e2e-"));
const database = join(temporary, "database.sqlite");
writeFileSync(database, "");
const backend = resolve("../Health_Guard-backend");
const env = {
  ...process.env,
  APP_ENV: "testing",
  APP_DEBUG: "false",
  APP_KEY: "base64:" + randomBytes(32).toString("base64"),
  DB_CONNECTION: "sqlite",
  DB_DATABASE: database,
  DB_URL: "",
  CACHE_STORE: "array",
  SESSION_DRIVER: "array",
  MAIL_MAILER: "array",
  FEATURE_EMAIL: "false",
  LOG_CHANNEL: "stderr",
  LOG_LEVEL: "error",
  BCRYPT_ROUNDS: "4",
  APP_URL: "http://127.0.0.1:4173",
  FRONTEND_URL: "http://127.0.0.1:4173",
};
for (const args of [
  ["artisan", "migrate", "--force"],
  ["artisan", "db:seed", "--class=E2ESeeder", "--force"],
]) {
  const result = spawnSync("php", args, {
    cwd: backend,
    env,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    rmSync(temporary, { recursive: true, force: true });
    process.exit(result.status || 1);
  }
}
const php = spawn(
  "php",
  [
    "-S",
    "127.0.0.1:8011",
    resolve(
      backend,
      "vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php",
    ),
  ],
  { cwd: resolve(backend, "public"), env, stdio: "inherit" },
);
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  {
    env: { ...process.env, VITE_BACKEND_URL: "http://127.0.0.1:8011" },
    stdio: "inherit",
  },
);
let closing = false;
const stopToken = randomBytes(32).toString("hex");
const control = createServer((request, response) => {
  if (
    request.method !== "POST" ||
    request.headers.authorization !== "Bearer " + stopToken
  ) {
    response.writeHead(403).end();
    return;
  }
  response.end("Stopping test servers");
  setTimeout(stop, 100);
});
control.listen(0, "127.0.0.1", () => {
  mkdirSync(".cache", { recursive: true });
  writeFileSync(
    ".cache/e2e-control.json",
    JSON.stringify({ port: control.address().port, token: stopToken }),
  );
});
function stop() {
  if (closing) return;
  closing = true;
  php.kill();
  vite.kill();
  control.close();
  try {
    rmSync(temporary, { recursive: true, force: true });
  } catch {
    /* A Windows child may hold the temporary database until shutdown. */
  }
  process.exit();
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
php.on("exit", stop);
vite.on("exit", stop);
