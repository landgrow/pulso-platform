import { test, expect } from "@playwright/test";

// Mesma nota das stories 1.3/1.4/1.5 (ver os outros specs em tests/e2e/): o
// fluxo autenticado completo ("editar coleção → ver revision na timeline →
// restaurar") ainda não é testável em e2e — não existe fixture de
// usuário/org de teste no projeto. Ver docs/stories/epics/epic-1-collections/1.6.story.md.
test.describe("Coleta — Histórico de versões", () => {
  test("unauthenticated user is redirected from the historico page to login", async ({
    page,
  }) => {
    await page.goto(
      "/clientes/qualquer-slug/periodo/00000000-0000-0000-0000-000000000000/historico",
    );

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
