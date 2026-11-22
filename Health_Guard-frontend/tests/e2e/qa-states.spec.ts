import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function login(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill("client@e2e.example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("E2E-only-password-2026");
  await page.getByRole("button", { name: "Selamat datang kembali" }).click();
  await expect(page).toHaveURL(/\/claims$/);
}

test("loading, failed request, retry, empty results and expired session", async ({
  page,
}) => {
  await login(page);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route("**/api/claims?**", async (route) => {
    await delayed;
    if (fail) return route.abort("failed");
    return route.continue();
  });
  await page.goto("/claims?q=QA-no-matching-record-98453");
  try {
    await expect(
      page.getByRole("status").filter({ hasText: "Memuat / Loading" }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toContainText("Connection failed");
  fail = false;
  await page.getByRole("button", { name: "Coba lagi / Retry" }).click();
  await expect(
    page.getByText("Tidak ada klaim sesuai filter.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue(
    "QA-no-matching-record-98453",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.unroute("**/api/claims?**");

  // Revoke the real fixture token rather than only mocking a 401 response.
  const token = await page.evaluate(() => localStorage.getItem("auth_token"));
  const logout = await page.request.post("/api/logout", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(logout.ok()).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("auth_token")),
  ).toBeNull();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
});

test("form exposes localized labels, invalid fields, current step and focus at mobile width", async ({
  page,
}, testInfo) => {
  await login(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/claims/new");
  for (const locale of ["id", "en"] as const) {
    const english = locale === "en";
    if (english)
      await page.getByRole("button", { name: "EN", exact: true }).click();
    const patient = page.getByLabel(english ? "Patient name" : "Nama pasien", {
      exact: true,
    });
    await patient.fill("");
    await page
      .getByRole("button", {
        name: english ? "Continue" : "Lanjut",
        exact: true,
      })
      .click();
    await expect(patient).toBeFocused();
    await expect(patient).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert")).toBeVisible();
    const validationMessage = await patient.evaluate(
      (input: HTMLInputElement) => input.validationMessage,
    );
    await expect(page.getByRole("alert").getByRole("listitem")).toHaveText(
      `${english ? "Patient name" : "Nama pasien"}: ${validationMessage}`,
    );
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: testInfo.outputPath(`form-errors-${locale}-360.png`),
      fullPage: true,
    });
    await patient.fill("QA Patient");
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Step 2 of 4/ }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Hospital", { exact: true })).toBeFocused();
});
