import { test, expect, type Page } from "@playwright/test";

const password = "E2E-only-password-2026";
async function signIn(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Selamat datang kembali" }).click();
}
async function reviewAndSubmit(page: Page) {
  for (let step = 0; step < 3; step++) {
    await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Kirim pengajuan" }).click();
  await expect(page).toHaveURL(/\/claims\/CLM-/);
}

test("registration, document, rejection, resubmission, partial approval and private access", async ({
  page,
  browser,
}, testInfo) => {
  const email = `matrix-${testInfo.retry}@e2e.example.test`;
  await page.goto("/register");
  await page.getByLabel("Nama lengkap").fill("Matrix patient");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Konfirmasi password").fill(password);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/claims$/);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/claims$/);
  await page.goto("/claims/new");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Periksa data pengajuan");
  await expect(page.getByLabel(/^Provider/)).toBeFocused();
  await page
    .getByLabel(/^Provider/)
    .fill("Matrix hospital");
  await page
    .getByLabel(/^Kategori klaim/)
    .fill("Outpatient");
  await page.getByRole("spinbutton", { name: /^Nominal klaim/ }).fill("0");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: /^Nominal klaim/ }),
  ).toBeFocused();
  await page.getByRole("spinbutton", { name: /^Nominal klaim/ }).fill("500.50");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page
    .getByLabel("Pilih dokumen pendukung")
    .setInputFiles({
      name: "matrix.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nMatrix receipt"),
    });
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Kirim pengajuan" }).click();
  await expect(page).toHaveURL(/\/claims\/CLM-/);
  const url = page.url();
  const id = url.split("/").at(-1)!;
  await expect(page.getByText("submitted", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "matrix.pdf", exact: true }),
  ).toBeVisible();

  const context = await browser.newContext();
  try {
    const analyst = await context.newPage();
    await analyst.goto("/analyst/review/" + id);
    await signIn(analyst, "analyst@e2e.example.test");
    await expect(analyst).toHaveURL(new RegExp("/claims/" + id + "$"));
    await analyst.reload();
    await expect(analyst.getByRole("heading", { name: id, exact: true })).toBeVisible();
    await analyst.getByRole("link", { name: "Belum ditugaskan", exact: true }).click();
    await expect(analyst).toHaveURL(/\/claims\?scope=unassigned$/);
    await analyst.getByRole("link", { name: id, exact: true }).click();
    await analyst.getByRole("button", { name: "Ambil tugas" }).click();
    await analyst
      .getByLabel("Status", { exact: true })
      .selectOption("Rejected");
    await analyst.getByRole("button", { name: "Tinjau keputusan" }).click();
    await expect(analyst.getByRole("dialog")).toHaveCount(0);
    await expect(analyst.getByLabel("Catatan")).toBeFocused();
    await analyst.getByLabel("Catatan").fill("Please correct receipt details");
    await analyst.getByRole("button", { name: "Tinjau keputusan" }).click();
    await analyst.getByRole("button", { name: "Konfirmasi & simpan" }).click();
    await expect(analyst.locator(".page-header .badge")).toHaveText("Rejected");
    await page.reload();
    await expect(page.locator(".page-header .badge")).toHaveText("Rejected");
    await expect(page.locator("blockquote")).toHaveText(
      "Please correct receipt details",
    );
    await page.getByRole("link", { name: "Perbaiki & ajukan ulang" }).click();
    await reviewAndSubmit(page);
    await expect(page.locator(".page-header .badge")).toHaveText("Pending");
    await expect(page.getByText("resubmitted", { exact: true })).toBeVisible();
    await analyst.reload();
    await analyst
      .getByLabel("Status", { exact: true })
      .selectOption("Partially Approved");
    await analyst.getByRole("button", { name: "Tinjau keputusan" }).click();
    await expect(analyst.getByRole("dialog")).toHaveCount(0);
    await analyst.getByLabel("Nominal disetujui (IDR)").fill("501");
    await analyst.getByRole("button", { name: "Tinjau keputusan" }).click();
    await expect(analyst.getByRole("dialog")).toHaveCount(0);
    await analyst.getByLabel("Nominal disetujui (IDR)").fill("200.25");
    await analyst.getByRole("button", { name: "Tinjau keputusan" }).click();
    await analyst.getByRole("button", { name: "Konfirmasi & simpan" }).click();
    await expect(analyst.locator(".page-header .badge")).toHaveText(
      "Partially Approved",
    );
    await page.goto("/notifications");
    await page
      .getByRole("button", { name: /Claim Partially Approved/ })
      .click();
    await expect(page).toHaveURL(url);
    await page.goto("/notifications");
    await page.getByRole("button", { name: "Tandai semua dibaca" }).click();
    await expect(
      page.locator("article strong").filter({ hasText: "●" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("link", { name: /^Notifikasi/ })).toHaveText(
      "Notifikasi 0",
    );

    const ownerToken = await page.evaluate(() =>
      localStorage.getItem("auth_token"),
    );
    const detailResponse = await page.request.get("/api/claims/" + id, {
      headers: { Authorization: "Bearer " + ownerToken },
    });
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    const outsiderResponse = await page.request.post("/api/register", {
      data: {
        name: "Other patient",
        email: `outsider-${testInfo.retry}@e2e.example.test`,
        password,
      },
    });
    expect(outsiderResponse.status()).toBe(201);
    const outsider = await outsiderResponse.json();
    for (const suffix of [
      "",
      "/history",
      "/documents",
      `/documents/${detail.documents[0].id}/download`,
    ]) {
      const response = await page.request.get("/api/claims/" + id + suffix, {
        headers: { Authorization: "Bearer " + outsider.token },
      });
      expect(response.status()).toBe(403);
    }
    await page.evaluate(
      (token) => localStorage.setItem("auth_token", token),
      outsider.token,
    );
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: id, exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("alert").first()).toBeVisible();
  } finally {
    await context.close();
  }
});
