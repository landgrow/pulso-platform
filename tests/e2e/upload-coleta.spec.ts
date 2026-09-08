import { test, expect } from "@playwright/test";

// Mesma nota da story 1.3 (tests/e2e/formulario-coleta.spec.ts): o fluxo
// autenticado completo ("carregar página → soltar arquivo → ver na listagem")
// ainda não é testável em e2e — não existe fixture de usuário/org de teste
// no projeto. Ver docs/stories/epics/epic-1-collections/1.4.story.md.
test.describe("Coleta — Upload de arquivos", () => {
  test("unauthenticated user is redirected from the upload page to login", async ({
    page,
  }) => {
    await page.goto("/clientes/qualquer-slug/coleta/upload");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
