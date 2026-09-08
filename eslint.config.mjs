import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // ─── Código vanilla JS legado (migração para Next.js em andamento) ───
    // NÃO LINTAR estes diretórios — fazem parte do BIN legada que está sendo
    // migrada para src/. Serão removidos quando a migração concluir.
    "views/**",
    "store.js",
    "charts.js",
    "app.js",
    "auth.js",
    "lib/**",
    "api/**",
    "data/**",
    "supabase/**",
    "db/**",
    "index.html",
    "styles.css",
    "fluent forms/**",
    "docs-archive/**",

    // Scripts de QA manual (não fazem parte do app nem das suítes de teste
    // automatizadas em tests/) — rodados à mão via `node <arquivo>.js`.
    "test-kanban.js",

    // Dependências e configs externos
    "node_modules/**",
    "scripts/**",

    // aiox-core (framework de squads importado)
    "**/aiox-core/**",
    ".aiox-core/**",
  ]),
]);

export default eslintConfig;
