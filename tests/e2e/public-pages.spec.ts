import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads with PULSO branding", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/PULSO/);
    await expect(
      page.getByRole("heading", { name: /inteligência/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /acessar sistema/i }).first(),
    ).toBeVisible();
  });

  test("login page is accessible from home", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /acessar sistema/i })
      .first()
      .click();

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("heading", { name: /entrar/i })).toBeVisible();
  });

  test("privacy policy is public and complete", async ({ page }) => {
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", { name: /política de privacidade/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/lei geral de proteção de dados/i),
    ).toBeVisible();
  });

  test("terms of use is public and complete", async ({ page }) => {
    await page.goto("/terms");

    await expect(
      page.getByRole("heading", { name: /termos de uso/i }),
    ).toBeVisible();
    await expect(page.getByText(/lei aplicável/i)).toBeVisible();
  });
});

test.describe("Auth flow", () => {
  test("forgot password page is accessible", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: /recuperar senha/i }),
    ).toBeVisible();
  });
});

test.describe("Route protection", () => {
  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Middleware deve redirecionar
    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("unauthenticated user is redirected from settings", async ({ page }) => {
    await page.goto("/configuracoes/organizacoes");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("register route no longer exists — self-service signup was removed", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("unauthenticated user is redirected from admin/acessos", async ({
    page,
  }) => {
    await page.goto("/admin/acessos");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
