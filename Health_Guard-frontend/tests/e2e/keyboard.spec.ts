import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
}

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press("Tab");
  }
  throw new Error(
    "Control cannot be reached by Tab: " + (await target.getAttribute("name")),
  );
}
async function enter(page: Page, target: Locator, value: string) {
  await tabTo(page, target);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(value);
}
async function activate(page: Page, target: Locator) {
  await tabTo(page, target);
  await page.keyboard.press("Enter");
}
async function login(page: Page, role: string) {
  await enter(
    page,
    page.getByLabel("Email", { exact: true }),
    role + "@e2e.example.test",
  );
  await enter(
    page,
    page.getByLabel("Password", { exact: true }),
    "E2E-only-password-2026",
  );
  await activate(
    page,
    page.getByRole("button", { name: "Selamat datang kembali" }),
  );
}

test("keyboard client submission and analyst decision with native dialog focus", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await login(page, "client");
  await expect(page).toHaveURL(/\/claims$/);
  await expectNoPageOverflow(page);
  const menuButton = page.getByRole("button", { name: "Buka menu" });
  await activate(page, menuButton);
  await expect(
    page.getByRole("dialog", { name: "Menu navigasi" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();
  await activate(page, menuButton);
  await activate(
    page,
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Ajukan klaim", exact: true }),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await enter(page, page.getByLabel("Nama pasien"), "Keyboard patient");
  await activate(
    page,
    page.getByRole("button", { name: "Lanjut", exact: true }),
  );
  await expect(
    page.getByRole("heading", { name: "Langkah 2 dari 4: Layanan" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Rumah sakit", { exact: true })).toBeFocused();
  await enter(
    page,
    page.getByLabel("Rumah sakit", { exact: true }),
    "Keyboard hospital",
  );
  await enter(page, page.getByLabel("Penyakit"), "Flu");
  await enter(page, page.getByLabel("Jenis layanan"), "Outpatient");
  await enter(page, page.getByLabel("Nominal klaim (IDR)"), "100");
  await activate(
    page,
    page.getByRole("button", { name: "Lanjut", exact: true }),
  );
  const chooserPromise = page.waitForEvent("filechooser");
  await activate(page, page.getByLabel("Pilih dokumen pendukung"));
  const chooser = await chooserPromise;
  // Browser actions use the keyboard; fixture bytes replace the native OS picker.
  await chooser.setFiles({
    name: "keyboard.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await activate(
    page,
    page.getByRole("button", { name: "Lanjut", exact: true }),
  );
  await tabTo(page, page.getByRole("checkbox"));
  await page.keyboard.press("Space");
  await activate(page, page.getByRole("button", { name: "Kirim pengajuan" }));
  await expect(page).toHaveURL(/\/claims\/CLM-/);
  const url = page.url();
  await expect(
    page.getByRole("heading", { name: "Histori klaim" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Halaman chat" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Halaman histori klaim" }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const documentButton = page.getByRole("button", {
    name: "keyboard.png",
    exact: true,
  });
  await activate(page, documentButton);
  const preview = page.getByRole("dialog", { name: "keyboard.png" });
  await expect(preview).toBeVisible();
  await expect(preview.locator("iframe")).toHaveAttribute(
    "title",
    "keyboard.png",
  );
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(documentButton).toBeFocused();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoPageOverflow(page);
  }
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
  });
  try {
    const analyst = await context.newPage();
    await analyst.goto(url);
    await login(analyst, "analyst");
    await expect(analyst).toHaveURL(url);
    await expectNoPageOverflow(analyst);
    await activate(
      analyst,
      analyst.getByRole("button", { name: "Ambil tugas" }),
    );
    await expect(
      analyst.getByRole("heading", { name: "Keputusan analis" }),
    ).toBeVisible();
    const opener = analyst.getByRole("button", { name: "Tinjau keputusan" });
    await activate(analyst, opener);
    const dialog = analyst.getByRole("dialog");
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 8; index++) {
      await analyst.keyboard.press(index % 2 ? "Shift+Tab" : "Tab");
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBeTruthy();
    }
    await analyst.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await activate(analyst, opener);
    expect(
      (await new AxeBuilder({ page: analyst }).analyze()).violations,
    ).toEqual([]);
    await activate(
      analyst,
      analyst.getByRole("button", { name: "Konfirmasi & simpan" }),
    );
    await expect(analyst.locator(".page-header .badge")).toHaveText("Approved");
    await page.reload();
    await expect(page.locator(".page-header .badge")).toHaveText("Approved");
  } finally {
    await context.close();
  }
});
