import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page, role: string) {
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill(role + "@e2e.example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("E2E-only-password-2026");
  await page.getByRole("button", { name: "Selamat datang kembali" }).click();
  await expect(page).toHaveURL(/\/claims$/);
}
test("client submits, analyst requests information, client resubmits, analyst approves", async ({
  page,
  browser,
}) => {
  await login(page, "client");
  await page
    .getByRole("link", { name: "Ajukan klaim", exact: true })
    .first()
    .click();
  await page.getByLabel("Nama pasien").fill("E2E Patient");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByLabel("Provider", { exact: true }).fill("E2E Hospital");
  await page.getByLabel("Kategori klaim").fill("Outpatient");
  await page.getByLabel("Nominal klaim (IDR)").fill("1000.50");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Kirim pengajuan" }).click();
  await expect(page).toHaveURL(/\/claims\/CLM-/);
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("heading", { name: /CLM-/ })).toBeVisible();
  const context = await browser.newContext();
  const analyst = await context.newPage();
  await login(analyst, "analyst");
  await analyst.goto(url);
  await analyst.getByRole("button", { name: "Ambil tugas" }).click();
  await analyst.getByRole("heading", { name: "Keputusan analis" }).waitFor();
  await analyst.getByText("Minta dokumen tambahan", { exact: true }).click();
  await analyst.getByLabel("Judul dokumen").fill("Receipt");
  await analyst.getByLabel("Petunjuk").fill("Please upload a receipt");
  await analyst
    .getByRole("button", { name: "Kirim permintaan (Needs Info)" })
    .click();
  await expect(analyst.locator(".page-header .badge")).toHaveText("Needs Info");
  await page.reload();
  await page.getByRole("link", { name: "Perbaiki & ajukan ulang" }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Kirim pengajuan" }).click();
  await expect(page.locator(".page-header .badge")).toHaveText("Pending");
  await analyst.reload();
  await analyst.getByRole("button", { name: "Tinjau keputusan" }).click();
  await expect(analyst.getByRole("dialog")).toBeVisible();
  expect(
    (await new AxeBuilder({ page: analyst }).analyze()).violations,
  ).toEqual([]);
  await analyst.getByRole("button", { name: "Konfirmasi & simpan" }).click();
  await expect(analyst.locator(".page-header .badge")).toHaveText("Approved");
  await page.reload();
  await expect(page.locator(".page-header .badge")).toHaveText("Approved");
  await expect(
    page.getByRole("heading", { name: "Histori klaim" }),
  ).toBeVisible();
  await context.close();
});
test("accessibility, responsive navigation, draft resume and locale", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole('heading',{name:'Selamat datang kembali'})).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await login(page, "client");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading',{name:'Daftar klaim'})).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("link", { name: "Ajukan klaim", exact: true })
    .first()
    .click();
  await page.getByLabel("Nama pasien").fill("Saved patient");
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(
    page.getByText("Draf disimpan.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Draf tersimpan" }).click();
  await page.getByRole("link", { name: "Saved patient" }).click();
  await expect(page.getByLabel("Nama pasien")).toHaveValue("Saved patient");
  await page
    .getByRole("combobox", { name: "Bahasa", exact: true })
    .selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Submit claim" }),
  ).toBeVisible();
});
