# R9 — Architecture Map + Technical Debt Register · Reporte

> **Fecha:** 2026-06-16 · Repo `frogo777/wedge` (`main`, `ac8496b`) · Deploy `https://wedge-4r7s.vercel.app`.
> Fase de arquitectura/documentación (NO features). Auditado con 6 agentes sobre el repo real + RLS en
> Supabase vía MCP. **Sin cambios de código. 0 P0 de seguridad.**

## 1. Resumen ejecutivo
Wedge v1 es un **sistema pequeño, coherente y honesto** en dogfooding estable. El camino real del usuario es
estrecho y trazable: XML/ZIP (client-only, redactado) → Fiscal Inbox → motores fiscales canónicos → Mes
Fiscal → snapshot redactado (RLS owner-only) → luk (señales deterministas). La privacidad es **sólida por
diseño** (RFC enmascarado, UUID dropeado, XML nunca sale del navegador, doble red anti-PII server-side) y la
auditoría de 6 lentes **no encontró ningún P0**. La deuda real es de **operación/verificabilidad**, no de
seguridad de producto: schema/RLS sin versionar, tests de seguridad fuera de CI, sin CI automático, y los
pendientes manuales del founder (rotar secretos, borrar Vercel duplicado).

## 2. Documentos creados
1. `SYSTEM_ARCHITECTURE.md` — 15 capas (qué existe / archivos / solidez / riesgos / falta).
2. `SYSTEM_DESIGN_MAP.md` — modelo mental, 6+ estados, jerarquía de datos, reglas UX, mapa de 11 pantallas.
3. `TECHNICAL_DEBT_REGISTER.md` — deuda P0–P3 en 10 categorías, con fix y fase.
4. `DATA_FLOW_MAP.md` — los 7 flujos (entra/sale/dónde se guarda/riesgos/protecciones).
5. `SECURITY_ARCHITECTURE.md` — principios, auth, DB, API, frontend, secretos, pendientes.
6. `TESTING_STRATEGY.md` — qué se prueba, fixtures, manual QA, gaps, release checklist.
7. `ROADMAP_BY_SYSTEM_AREA.md` — R10–R14 + 7A/7B/7C (objetivo/entregables/riesgos/salida).
8. `R9_ARCHITECTURE_MAP_REPORT.md` — este reporte.

## 3. Hallazgos principales
- **El middleware (`proxy.ts`) SÍ está cableado** en Next 16 (renombra `proxy.js`→`middleware.js`); el gating no es código muerto.
- **RLS owner-only verificada en runtime** (`set role anon` → 0 filas); única tabla `fiscal_month_snapshots`; `profiles` no existe.
- **Sentry SÍ está integrado** (3 runtimes + `instrumentation*.ts` + `withSentryConfig`, gated por DSN) — pero **sin captura manual** (errores tragados no llegan a Sentry).
- **Rate-limit es real y robusto** (Upstash + fallback in-memory) pero solo se usa en `/api/csp-report` (1 de 4 rutas).
- **`lib/tax` tiene mucho código futuro/muerto** no usado por v1 (regimes, calculators, iva, tz, cfdi-classifier, cfdi-sat).
- **Schema/RLS no está versionado** (aplicado por MCP; `supabase/migrations` vacío) — la mayor brecha de reproducibilidad.
- **8 tests legacy `*.test.ts` (incl. seguridad) no corren en `npm run test`**.
- **Sin CI ni `.husky`** — los gates de calidad son manuales.
- **`fetch('/api/referrals')` en signup → 404 huérfano** (try/catch; igual que el welcome ya removido).
- **`service-role` definido pero nunca usado** en producción (invariante con test).

## 4. Riesgos por severidad
- **P0:** ninguno. ✅
- **P1:** schema/RLS sin versionar (R10); 8 tests fuera de CI (R11); sin CI/gates (R11); rotar secretos + borrar Vercel duplicado (R10); aislamiento cross-user sin test contra RLS viva (R11).
- **P2:** rate-limit snapshot, CSP `unsafe-*`, leaked-password off, `/api/referrals` huérfano, Sentry sin captura manual, Vercel Analytics sin consent-gate, `lib/tax` muerto, eliminar-cuenta manual, enumeración "email no confirmado".
- **P3:** SMTP, Google, dominio, TipoCambio real, REP↔PPD, estado SAT, knowledge oficial, SAT real, MCP, monitoring/alerts, 2FA.

## 5. Qué está sólido
Motores fiscales usados (RESICO/Honorarios, cash-basis, 2026), pipeline CFDI + privacidad (redacción, client-only),
auth + gating + open-redirect, RLS owner-only + doble red anti-PII, snapshot (servidor autoridad), las 11
pantallas + reglas de UX (R7.5/R8/R8.1), DS, Sentry/PostHog/Clarity wiring + redacción PII, 417 tests verdes.

## 6. Qué es provisional
Error tracking (sin captura manual + DSN dependiente de env), CSP (`unsafe-inline/eval`), eliminar-cuenta y
soporte (manuales), TipoCambio/REP↔PPD/estado-cancelación (limitaciones honestas del v1), monitoring (reactivo,
sin alerting), Vercel Analytics (sin consent-gate).

## 7. Fase recomendada después
**R10 — Security / Ops cleanup**, en este orden: rotar secretos + revocar token, **borrar el Vercel duplicado
`wedge`**, **versionar el schema+RLS** (cierra la mayor deuda P1), activar leaked-password protection. Luego R11
(CI + los 8 tests + E2E/Playwright + aislamiento) **antes** de abrir a testers (R13). SAT/MCP (7A→7C) al final,
gateados por un modelo de seguridad. Nada inicia sin tu confirmación.

## 8. QA
`git status` limpio · **typecheck PASS · 417 tests (37 archivos) · build PASS (29 rutas) · lint 10e/5w** (baseline,
deuda en tests, 0 nueva). Solo se agregaron documentos `.md`; no se tocó código de producto.

## 9. Qué NO se implementó (regla de la fase)
No se construyeron features ni se corrigió deuda (R9 es solo documentar). No SAT/MCP/e.firma/CIEC/scraping/SMTP/
Google/servicios pagos/rediseño/cambios de código. No se tocó `wedgemx.com` ni se borró `wedge-4r7s`. El único
caso que habría justificado tocar código —un P0 de seguridad— **no se encontró**; los hallazgos quedan
registrados como deuda priorizada para R10+.
