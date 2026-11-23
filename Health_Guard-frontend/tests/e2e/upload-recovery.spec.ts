import { test, expect } from "@playwright/test";

test("failed upload can be retried without duplicate claims or confirmed documents", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill("client@e2e.example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("E2E-only-password-2026");
  await page.getByRole("button", { name: "Selamat datang kembali" }).click();
  await expect(page).toHaveURL(/\/claims$/);
  await page.goto("/claims/new");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByLabel("Rumah sakit", { exact: true }).fill("Recovery hospital");
  await page.getByLabel("Penyakit").fill("Flu");
  await page.getByLabel("Jenis layanan").fill("Outpatient");
  await page.getByLabel("Nominal klaim (IDR)").fill("100.50");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByLabel("Pilih dokumen pendukung").setInputFiles(
    ["confirmed.pdf", "retry.pdf", "remove.pdf"].map((name) => ({
      name,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nRecovery receipt " + name),
    })),
  );
  await page
    .getByRole("button", { name: "Hapus remove.pdf", exact: true })
    .click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  const selected = page.getByRole("list", { name: "Dokumen dipilih" });
  await expect(selected).toContainText("confirmed.pdf");
  await expect(selected).toContainText("retry.pdf");
  await expect(selected).not.toContainText("remove.pdf");

  const attempts: { url: string; filename: string }[] = [];
  let creations = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/claims"
    )
      creations++;
  });
  await page.route("**/api/claims/*/documents", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    const filename =
      request
        .postDataBuffer()
        ?.toString()
        .match(/filename="([^"]+)"/)?.[1] || "";
    attempts.push({ url: request.url(), filename });
    // Fail before reaching the server; the first file has already been acknowledged.
    if (
      filename === "retry.pdf" &&
      attempts.filter((item) => item.filename === filename).length === 1
    )
      return route.abort("failed");
    return route.continue();
  });
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/claims" &&
      response.request().method() === "POST",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Kirim pengajuan" }).click();
  const claim = (await (await created).json()) as { claim_id: string };
  const retry = page.getByRole("button", {
    name: "Coba ulang retry.pdf",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await expect(page).toHaveURL(/\/claims\/new$/);
  await expect(selected.getByText(/Terunggah/)).toHaveCount(1);

  await page.getByRole("link", { name: "Daftar klaim", exact: true }).click();
  const leaveDialog = page.getByRole("dialog", {
    name: "Perubahan belum disimpan",
  });
  await expect(leaveDialog).toBeVisible();
  await leaveDialog.getByRole("button", { name: "Tetap di sini" }).click();
  await expect(leaveDialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/claims\/new$/);
  await retry.click();
  await expect(page).toHaveURL(new RegExp("/claims/" + claim.claim_id + "$"));
  expect(creations).toBe(1);
  expect(attempts.map((item) => item.filename)).toEqual([
    "confirmed.pdf",
    "retry.pdf",
    "retry.pdf",
  ]);
  expect(new Set(attempts.map((item) => item.url)).size).toBe(1);

  await page.reload();
  await expect(
    page.getByRole("button", { name: "confirmed.pdf", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "retry.pdf", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "remove.pdf", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("submitted", { exact: true })).toHaveCount(1);
  await expect(
    page.getByText("document uploaded", { exact: true }),
  ).toHaveCount(2);
});
