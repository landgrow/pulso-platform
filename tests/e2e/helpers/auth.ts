import type { Page } from "@playwright/test";

/**
 * Credenciais de um usuário de teste dedicado (nunca um usuário/cliente real).
 * Ver docs/testing/e2e-setup.md para como criar esse usuário.
 */
export function getE2ECredentials(): {
  email: string;
  password: string;
  orgSlug: string;
} | null {
  const email = process.env.PULSO_E2E_EMAIL;
  const password = process.env.PULSO_E2E_PASSWORD;
  const orgSlug = process.env.PULSO_E2E_ORG_SLUG ?? "e2e-test";

  if (!email || !password) return null;
  return { email, password, orgSlug };
}

/**
 * true quando as credenciais de teste estão configuradas — use com
 * `test.skip(!hasE2ECredentials(), "...")` nos specs que precisam de login.
 */
export function hasE2ECredentials(): boolean {
  return getE2ECredentials() !== null;
}

/**
 * Faz login pela UI (não via API) — exercita o formulário de verdade,
 * como um usuário faria. Espera terminar em /dashboard.
 */
export async function loginAsE2EUser(page: Page): Promise<void> {
  const creds = getE2ECredentials();
  if (!creds) {
    throw new Error(
      "PULSO_E2E_EMAIL/PULSO_E2E_PASSWORD não configurados — ver docs/testing/e2e-setup.md",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Senha").fill(creds.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}
