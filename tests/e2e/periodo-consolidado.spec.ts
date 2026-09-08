import { test, expect } from "@playwright/test";

// Mesma nota das stories anteriores (ver os outros specs em tests/e2e/): o
// fluxo autenticado completo ("navegar até período → ver cards → mudar
// status") ainda não é testável em e2e — não existe fixture de usuário/org
// de teste no projeto. Ver docs/stories/epics/epic-1-collections/1.7.story.md.
test.describe("Período consolidado", () => {
  test("unauthenticated user is redirected from the client periods list to login", async ({
    page,
  }) => {
    await page.goto("/clientes/qualquer-slug");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("unauthenticated user is redirected from the periodo page to login", async ({
    page,
  }) => {
    await page.goto(
      "/clientes/qualquer-slug/periodo/00000000-0000-0000-0000-000000000000",
    );

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
