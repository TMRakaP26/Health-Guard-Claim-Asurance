import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function login(page: Page, role: string) {
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${role}@e2e.example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("E2E-only-password-2026");
  await page.getByRole("button", { name: "Selamat datang kembali" }).click();
  await expect(page).toHaveURL(/\/claims$/);
}

test("profile details persist and client pages have no axe violations", async ({
  page,
}, testInfo) => {
  await login(page, "client");
  await page.goto("/profile");
  await page.getByLabel("Telepon", { exact: true }).fill("081234567890");
  await page.getByLabel("Tanggal lahir", { exact: true }).fill("1990-02-03");
  await page.getByLabel("BPJS", { exact: true }).fill("0001234567890");
  await page.getByLabel("Alamat", { exact: true }).fill("Alamat fixture QA");
  await page
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(
    page.getByText("Profil disimpan", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Telepon", { exact: true })).toHaveValue(
    "081234567890",
  );
  await expect(page.getByLabel("Tanggal lahir", { exact: true })).toHaveValue(
    "1990-02-03",
  );
  await expect(page.getByLabel("BPJS", { exact: true })).toHaveValue(
    "0001234567890",
  );
  await expect(page.getByLabel("Alamat", { exact: true })).toHaveValue(
    "Alamat fixture QA",
  );
  for (const path of ["/profile", "/drafts", "/notifications", "/guide"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page.getByText("Memuat / Loading…", { exact: true }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(path.slice(1) + "-390.png"),
      fullPage: true,
    });
  }
});

test("admin catalog persists and administration has distinct landmarks", async ({
  page,
}, testInfo) => {
  const code = `QA-PROVIDER-${testInfo.retry}`;
  await login(page, "admin");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Administrasi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Memuat / Loading…", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Kode", { exact: true }).fill(code);
  await page.getByLabel("Nama", { exact: true }).fill("QA Fixture Hospital");
  await page
    .getByLabel("Alamat", { exact: true })
    .fill("Alamat provider fixture");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: `${code} · QA Fixture Hospital · Active`,
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: `${code} · QA Fixture Hospital · Active`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Halaman pengguna", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Halaman permintaan penghapusan",
      exact: true,
    }),
  ).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`admin-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "EN", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "User pages", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Deletion request pages",
      exact: true,
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
