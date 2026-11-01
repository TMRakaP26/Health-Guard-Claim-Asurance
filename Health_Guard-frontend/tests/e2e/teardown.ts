import { readFileSync, unlinkSync } from "node:fs";
export default async function teardown() {
  const path = ".cache/e2e-control.json";
  const info = JSON.parse(readFileSync(path, "utf8")) as {
    port: number;
    token: string;
  };
  await fetch("http://127.0.0.1:" + info.port, {
    method: "POST",
    headers: { Authorization: "Bearer " + info.token },
  });
  unlinkSync(path);
}
