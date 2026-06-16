# Testing Strategy — Wedge v1

> **Fecha:** 2026-06-16 · `ac8496b`. **417 tests · 37 archivos** descubiertos por Vitest (env node). QA verde.
> Auditado en R9. Hallazgo principal: **8 tests legacy `*.test.ts` NO se ejecutan en `npm run test`** (ver §4).

## 1. Qué ya se prueba
| Área | Cobertura | Archivos |
|---|---|---|
| **CFDI parser 4.0** | parse base + edges (DOM/regex), normalize, classify | `cfdi/parse.vitest.ts`, `normalize.vitest.ts`, `classify.vitest.ts`, `cfdi-parser.test.ts`* |
| **Synthetic pack** | caso-por-caso desde XML reales + agregado junio ($58,000) + privacidad | `cfdi/synthetic-pack.vitest.ts`, `synthetic-reconciliation.vitest.ts` |
| **Retenciones** | ISR/IVA por concepto (02-04) + **solo nivel documento** (05/F1, no $0) | `synthetic-pack.vitest.ts:50-66` |
| **PUE/PPD/REP** | PUE cobrado, PPD pendienteComplemento, REP excluido | `synthetic-pack`, `classify.vitest.ts` |
| **UsoCFDI** | G03 deducible vs S01 no-asumido | `synthetic-pack`, `taxes.vitest.ts` |
| **no-MXN** | USD excluido del auto-cálculo + warning | `synthetic-pack` (caso 11), `taxes.vitest.ts` |
| **Encoding** | ISO-8859-1 sin mojibake + control-chars C0 (R7.4C) | `cfdi/decode-xml.vitest.ts` |
| **Snapshot / persistence** | route (user_id de sesión, 422 PII, 401, 403 CSRF, DELETE acotado) + sanitización pura | `api/mes/snapshot/route.vitest.ts`, `mes/persistence.vitest.ts` |
| **RLS invariante** | grep: ningún archivo mezcla service-role con la tabla snapshot | `mes/snapshot-service-role-invariant.vitest.ts` |
| **luk** | señales deterministas, "no claims SAT", sin RFC/UUID, explicaciones, session-time | `luk/{signals,explanations,session-time}.vitest.ts` |
| **entry-mode (R7.5)** | snapshot DB gana al draft local | `mes/entry-mode.vitest.ts` |
| **Motor fiscal** | RESICO 113-E, Honorarios, regímenes, validators | `tax/resico.test.ts`*, `honorarios.test.ts`*, `tax/regimes/*.vitest.ts`, `tax/validators.vitest.ts` |
| **Otros** | from-cfdis, from-diagnostic, recompute, pending-actions, month, zip, preview-store, upload, diagnostico/draft+estimate, analytics, fiscal-knowledge | `src/lib/**/*.vitest.ts` |
| **Build / smoke** | `npm run build` (29 rutas) + smoke de endpoints en cada release | manual |

`*` = legacy `*.test.ts` que corren SOLO vía el harness `tests/vitest/v1-engine.test.ts` (importa 5 de 13 legacy).

## 2. Fixtures
- **Pack sintético** (`fixtures/cfdi/synthetic/`): 13 XML + 2 ZIP (pack junio = 12 XML; multimonth = mayo+junio).
- **Casos cubiertos:** ingreso PUE MXN, ret ISR, ret IVA, plataforma ret-concepto, plataforma ret-documento (F1), PPD, REP, gasto G03, gasto S01, egreso, USD, ISO-8859-1, mayo. (13 de 14; el "cancelado" es limitación documentada — el estatus no viaja en el XML.)
- **Regenerar:** `npm run fixtures:cfdi` (`scripts/generate-synthetic-cfdi-pack.mjs`, determinista; `toLatin1Safe` evita reintroducir el bug R7.4C del em-dash).
- **Verdad fijada:** 12 CFDIs · ingresos $58,000 · retenciones $3,575 · 8 ingresos / 2 gastos / 1 PPD / 0 cancelados / 6 revisión.

## 3. Manual QA (founder dogfooding)
- Smoke visual del founder en su sesión (R8.1): subir ZIP → 12/$58,000/$3,575, confirmar/excluir, guardar/recargar, logout/login, luk.
- Smoke de endpoints en cada release: `/`, `/login` (200), `/app/*` sin sesión (307→/login), `/api/debug/version`, `/opengraph-image`, `/icon.svg`.
- El fix R7.4C (control-chars en navegador) se verificó **a mano en navegador real** (no automatizado).

## 4. Gaps
- **CRÍTICO (P1): 8 tests legacy `*.test.ts` NO corren en `npm run test`.** `vitest.config.ts` incluye `tests/vitest/**/*.test.ts` + `src/**/*.vitest.ts` y EXCLUYE `src/**/*.test.ts`; el harness solo importa 5. Quedan fuera: `obs/{csrf,fresh-auth,sentry-redact,rate-limit-redis}.test.ts`, `consent.test.ts`, `tax/{iva,tz,validators}.test.ts`. **La lógica SÍ se usa en prod** (CSRF en snapshot, redacción Sentry, IVA), pero una regresión pasaría QA verde. → Añadirlos al harness o renombrar a `.vitest.ts` (R11).
- **Sin E2E/Playwright con login real** (sesión/SSR/cookies validados a mano).
- **Sin test de dos usuarios contra RLS viva** (la invariante es estática por grep, no ejecuta SQL).
- **Sin screenshots móvil** automatizados.
- **CFDIs reales** aún no probados (solo sintético).
- **Sin error tracking verificado por CI** (Sentry depende de DSN en env de Vercel; su test no corre en CI).

## 5. Release checklist (Definition of Done)
Antes de cada push a `main` / release:
- [ ] `npm run typecheck` PASS
- [ ] `npm run test` → 417+ tests verdes (sin regresión)
- [ ] `npm run build` PASS (rutas esperadas, sin errores)
- [ ] `npm run lint` ≤ baseline (10 errores / 5 warnings, deuda en tests; **0 nuevos**)
- [ ] Smoke endpoints: `/` 200 · `/login` 200 · `/app/mes` sin sesión → 307 `/login` · `/api/debug/version` = commit esperado
- [ ] Assets: `/opengraph-image` 200 · `/icon.svg` 200 (si tocó metadata)
- [ ] **Sin claims prohibidos** ("declara"/"paga"/"validado por SAT"/"listo para declarar")
- [ ] **Sin PII** en snapshot/logs/copy (RFC/UUID completos, XML crudo)
- [ ] `git status` limpio; commit en `main`; **no push sin confirmación del founder**
- [ ] Post-deploy: deployment READY + `/api/debug/version` = commit nuevo + `/app/mes` protegido

> Nota: este checklist es **manual** hoy (no hay CI ni husky — deuda P1, R11). El objetivo de R11 es automatizarlo.
