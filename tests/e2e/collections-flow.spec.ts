import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  hasE2ECredentials,
  loginAsE2EUser,
  getE2ECredentials,
} from "./helpers/auth";

const TEST_PDF = path.join(__dirname, "..", "fixtures", "e2e-teste.pdf");

// Os 5 cenários da AC-2 da Story 1.8 — fluxo autenticado de verdade, ao
// contrário dos outros specs em tests/e2e/ (que só confirmam o redirect de
// usuário não-autenticado). Precisam de um usuário/organização de teste
// dedicado — ver docs/testing/e2e-setup.md. Sem PULSO_E2E_EMAIL/PASSWORD
// configurados, os testes são pulados (não falham), pra não quebrar o CI de
// quem ainda não configurou o fixture.
const creds = getE2ECredentials();
const orgSlug = creds?.orgSlug ?? "e2e-test";

test.describe("Fluxo completo de coleções (Story 1.8, AC-2)", () => {
  test.skip(
    !hasE2ECredentials(),
    "PULSO_E2E_EMAIL/PASSWORD não configurados — ver docs/testing/e2e-setup.md",
  );

  test("criar período → upload de PDF → ver na listagem", async ({ page }) => {
    await loginAsE2EUser(page);

    // Garante que existe um período aberto pro mês atual
    await page.goto(`/clientes/${orgSlug}`);
    await page.getByRole("button", { name: /abrir coleta deste mês/i }).click();
    await page.waitForURL(/\/periodo\/[a-f0-9-]+$/);
    const periodoUrl = page.url();

    // /coleta/upload não leva periodId na URL — resolve pro período atual sozinha
    await page.goto(`/clientes/${orgSlug}/coleta/upload`);
    await page
      .getByLabel("Selecionar arquivos para upload")
      .setInputFiles(TEST_PDF);
    await expect(page.getByText("e2e-teste.pdf")).toBeVisible({
      timeout: 10_000,
    });

    // Volta pro período e confere que o card de Uploads contabilizou
    await page.goto(periodoUrl);
    await expect(page.getByText("1 arq.")).toBeVisible();
  });

  test("formulário: preencher 1 campo → ver indicador de salvo", async ({
    page,
  }) => {
    await loginAsE2EUser(page);

    await page.goto(`/clientes/${orgSlug}/coleta/formulario`);
    await page.getByLabel("Faturamento mensal (R$)").fill("250000");
    await expect(page.getByText("Salvo")).toBeVisible({ timeout: 5_000 });
  });

  test("navegar até período consolidado → ver status badge", async ({
    page,
  }) => {
    await loginAsE2EUser(page);

    await page.goto(`/clientes/${orgSlug}`);
    await page.getByRole("button", { name: /abrir coleta deste mês/i }).click();
    await page.waitForURL(/\/periodo\/[a-f0-9-]+$/);

    await expect(page.getByText("Em coleta")).toBeVisible();
    await expect(page.getByText("Formulário")).toBeVisible();
    await expect(page.getByText("Uploads")).toBeVisible();
  });

  test("rollback de uma revision funciona", async ({ page }) => {
    await loginAsE2EUser(page);

    // Duas edições consecutivas criam uma revision arquivada na segunda
    await page.goto(`/clientes/${orgSlug}/coleta/formulario`);
    await page.getByLabel("Faturamento mensal (R$)").fill("100000");
    await expect(page.getByText("Salvo")).toBeVisible({ timeout: 5_000 });

    await page.getByLabel("Faturamento mensal (R$)").fill("200000");
    await expect(page.getByText("Salvo")).toBeVisible({ timeout: 5_000 });

    // Pega o id do período atual pra ir direto ao histórico
    await page.goto(`/clientes/${orgSlug}`);
    await page
      .getByRole("link", { name: new RegExp(String(new Date().getFullYear())) })
      .first()
      .click();
    await page.waitForURL(/\/periodo\/[a-f0-9-]+$/);
    const periodoUrl = page.url();

    await page.goto(`${periodoUrl}/historico`);
    // Entradas vêm mais recente primeiro: [0] é a versão atual (sem botão de
    // restaurar), [1] é a revision arquivada pela segunda edição.
    await page.getByText("Formulário").nth(1).click();
    const restoreButton = page
      .getByRole("button", { name: /restaurar esta versão/i })
      .first();
    await expect(restoreButton).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await restoreButton.click();

    await expect(page.getByText("Versão restaurada")).toBeVisible({
      timeout: 10_000,
    });
  });

  test.skip("upload de áudio → ver transcrição", async () => {
    // Adiado desde a Story 1.5: a Claude API não suporta transcrição de
    // áudio (só text/image/document) e a integração com um vendor de ASR
    // real (Whisper/Deepgram/AssemblyAI/Google/AWS) ainda não foi
    // escolhida — ver docs/stories/epics/epic-1-collections/1.5.story.md.
  });
});
