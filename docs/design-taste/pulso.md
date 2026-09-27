# Design Map

Source: http://localhost:3000 — 4 pages (login, dashboard, /admin/atividades, /admin/financeiro). Viewport 1440×900.

## Spacing Scale

- Base: 4px. Working steps: 4 / 8 / 12 / 16 / 24 / 32
- Highest counts: 8px, 12px, 10px (rail), 16px
- Off-grid: 6px, 10px in sidebar padding
- Section gaps: 16px (chart row), 24px (block → block)
- Main padding: 32px. Nav padding: 12px 8px

## Font Hierarchy

- Family: Inter only (cv02/cv03/cv04/cv11, tabular-nums on body)
- 32px / 600 — hero KPI (saldo)
- 24–28px / 600 / -0.6 to -0.7px — page h1
- 20px / 600 / -0.5px — in-page h3
- 18px / 600 — rail wordmark “PULSO”
- 14px / 400–500 — body, nav items, table
- 12px / 500 — meta, ticks, secondary actions
- 11px / 500–600 — field labels, SMART keys, chart captions
- 700 — wordmark only

## Color Palette

Dark HQ (system default, `html.dark`):

- Canvas `#0a0f1e` (~38–59% area)
- Surface `#111827` (~39–61% area)
- Surface-2 `#1a2340`
- Border `#26304d`
- Text `#e8ecf5` / `#9aa5c0` / `#6b7699`
- Interactive `#6366f1` (<1% area)
- Brand lime `#b8f000` (glyph on navy, ~1 text node)
- Money in `#d4ee57` · money out `#fb7185`

Light (`:root` + login form pane):

- Canvas `#f7f8fb` · surface `#ffffff`
- Text `#1a2340` / `#5b6788`
- Money in `#3d6b1f` · money out `#b42318`
- Same interactive `#6366f1` · same lime `#b8f000`

Neutrals are blue-navy tints, not pure gray (`#0a0f1e`, `#1a2340`, `#e8ecf5`).

## Image Ratios

- None. Zero `<img>` with naturalWidth > 80 on the four pages. No photography, no illustration, no avatar grid.

## Component Tokens

- Radius: 4px (tight), 8px (controls / nav items), 12px (SMART list, KR cards), 16px (chart sections), pill ~9999px (status chips)
- Nested radius: 16px section → 8px inner controls
- Shadows: cards none. Selected rail item = 1px ring. Task modal = `shadow-2xl` (overlay only)
- Grid: no page max-width. Rail 224px + main 1216px. HQ charts 2 × 564px / 16px gutter. WorkSmart 342px | 513px / 24px gutter
- Motion: color/bg/border 150ms cubic-bezier(0.4, 0, 0.2, 1); sidebar width 200ms; Sheet enter 500ms / exit 300ms; global `prefers-reduced-motion` kill-switch; `:focus-visible` 2px primary outline
- Alignment: left throughout. No centered hero in the app. Login brand copy is left on the navy pane.

---

# Taste DNA

### Lime is the mark, indigo is the control

- **Trigger**: When placing brand color on a button, KPI, chart, or nav item
- **Decision**: Keep `#b8f000` on the LG glyph sitting on navy. Route clicks through `#6366f1`. On light surfaces, money-in is olive `#3d6b1f` — never lime type
- **Reason**: A consultant reading cash all day cannot have a highlighter as body type. The mark has to stay a mark or it stops working as identity
- **Evidence**: lime text count = 1 across Atividades; lime/yellow fills ~0.1% area; indigo fills ~0.1–0.5%; canvas+surface occupy 95%+; `globals.css` states lima only on navy

### Planes, not drop shadows

- **Trigger**: When grouping a card, chart, or SMART block
- **Decision**: Stack `#0a0f1e` → `#111827` → `#1a2340` with 1px `#26304d` and 12–16px radii. Do not lift cards with blur shadows
- **Reason**: This is a desk, not a storefront. Fake elevation around numbers makes the HQ look like a template the moment the data is the product
- **Evidence**: extractor `cards.shadow = null` on WorkSmart `dl` and Financeiro `section.rounded-xl`; surface-1 is 56–61% of painted area; the only perceivable depth on the rail is a 1px indigo/lime ring

### Inter at 11–14px is the working size

- **Trigger**: When setting type for tables, KR lists, nav, and chart ticks
- **Decision**: One family (Inter). Body 14px/400–500. Labels 11–12px. Page titles 24–28px/600 with −0.6px tracking. No display face. No 16px-as-default
- **Reason**: The job is comparing numbers and statuses, not reading an essay. 16px body would push two KR cards off a 900px viewport
- **Evidence**: Inter 268–377 nodes/page, zero second family; sizeDistribution peaks 14 then 12 then 11; 400+500 carry weight; 700 appears once

### Login is a split; the product is a rail

- **Trigger**: When designing an unauthenticated vs authenticated surface
- **Decision**: Login = 50/50 navy brand panel + white form, no extra chrome. App = 224px rail, no desktop header, Administração inside the PULSO block
- **Reason**: The first screen sells Land Grow. Every screen after that is work. A marketing header over the dashboard would steal height from the cash row
- **Evidence**: login navy left (LG + PULSO + rule + Land Grow) / white form right; authenticated sidebar 224px + main 1216px; selected nav = indigo/10 fill + 1px ring, 14px/500
