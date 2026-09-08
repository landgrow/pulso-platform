import { test, expect } from "@playwright/test";

// NOTA: o fluxo autenticado completo ("carregar página → preencher 1 campo →
// ver autosave") ainda não é testável em e2e — não existe fixture de usuário/org
// de teste no projeto (nenhum arquivo em tests/e2e cria conta ou faz login
// programaticamente). Isso é uma lacuna real, não escondida: ver
// docs/stories/epics/epic-1-collections/1.3.story.md, Change Log.
//
// O que dá pra testar honestamente agora, e que já é o padrão estabelecido em
// public-pages.spec.ts (seção "Route protection"): a rota exige autenticação.
test.describe("Coleta — Formulário estruturado", () => {
  test("unauthenticated user is redirected from the coleta form to login", async ({
    page,
  }) => {
    await page.goto("/clientes/qualquer-slug/coleta/formulario");

    await page.waitForURL(/.*\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
