import { test, expect } from "@playwright/test";

// Mesma nota das stories 1.3/1.4 (tests/e2e/formulario-coleta.spec.ts,
// tests/e2e/upload-coleta.spec.ts): o fluxo autenticado completo
// ("carregar página → escrever texto → ver na listagem") ainda não é
// testável em e2e — não existe fixture de usuário/org de teste no projeto.
// Ver docs/stories/epics/epic-1-collections/1.5.story.md.
test.describe("Coleta — Texto livre", () => {
  test("unauthenticated user is redirected from the texto page to login", async ({
    page,
  }) => {
    await page.goto("/clientes/qualquer-slug/coleta/texto");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
