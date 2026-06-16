# System Architecture — Wedge v1

> **Fecha:** 2026-06-16 · Repo `frogo777/wedge` (`main`, `ac8496b`) · Deploy `https://wedge-4r7s.vercel.app`.
> Mapa de arquitectura del sistema (fase R9, solo documentación). Auditado con 6 agentes sobre el repo real
> + verificación de RLS en Supabase vía MCP. **Sin P0 de seguridad.**

## 1. Resumen ejecutivo
Wedge v1 es un **Fiscal OS para personas físicas MX (RESICO PF / Honorarios)** en **dogfooding estable**, sin
costo y sin servicios externos de pago. Lo que existe hoy:
- **Login por contraseña** (Supabase Auth; Google/magic-link diferidos "Pronto" sin SMTP).
- **Mes Fiscal** (`/app/mes`): el mes accionable ("esto está listo / falta / sigue") con cálculo informativo.
- **Carga XML/ZIP manual** (client-only, sin red, sin persistir XML) → **vista previa**.
- **Fiscal Inbox** (`/app/cfdis`): cada CFDI es una decisión (confirmar/excluir/revisar).
- **luk** (`/app/luk`): señales deterministas (sin LLM, sin SAT).
- **Snapshot guardado**: resumen **redactado** persistido en Supabase con **RLS owner-only**.
- **Supabase** (Auth + 1 tabla `fiscal_month_snapshots`) + **Vercel** (hosting/CI por git-push).

Ancla de producto: **"Wedge prepara; tú validas y presentas en SAT."** No declara, no paga, no toca el SAT.

## 2. Diagrama lógico (texto)
```
Usuario (navegador)
 ├─ Páginas públicas (/, /diagnostico, /login, /signup, /soporte, legales)
 │    └─ Diagnóstico → draft en localStorage (sin PII fuerte, TTL 30d)
 ├─ Auth (Supabase @supabase/ssr, PKCE) ── proxy.ts (middleware Next 16: gating /app, /onboarding)
 └─ App protegida (/app/*)
      /app/mes ─┐
                ├─ CFDI Engine (client-only): upload → decodeXmlBytes → parseMany → normalizeCfdi
                │     (RFC enmascarado, UUID dropeado, XML nunca sale del navegador)
                │     → preview-store (sessionStorage: RedactedCfdi[], sin PII)
                ├─ Fiscal Inbox (/app/cfdis): classify + decisiones → recompute
                ├─ Motores fiscales canónicos (@/lib/tax: resico.ts / honorarios.ts) → FiscalMonth
                ├─ luk signals (/app/luk): deterministas desde FiscalMonth/CFDIs/decisiones
                └─ SaveMesPanel → POST /api/mes/snapshot
                        → auth(getUser) + CSRF(requireSameOrigin) + whitelist + assertNoSensitiveFields
                        → Supabase DB (fiscal_month_snapshots) con RLS owner-only (auth.uid()=user_id)
Observabilidad: Sentry (gated DSN) · logger JSON → Vercel logs · PostHog/Clarity (consent-gated) · /api/csp-report
```

## 3. Capas del sistema

### 3.1 Product Structure
- **Qué existe:** Mes Fiscal + Fiscal Inbox + luk + diagnóstico + snapshot; modelo "preparar, no declarar".
- **Archivos:** `src/app/**` (20 pages, 4 API routes), `src/lib/**` (62 módulos).
- **Sólido.** **Riesgo:** alcance v1 vs código futuro mezclado (ver Fiscal). **Falta:** datos reales/testers.

### 3.2 Design System
- **Qué existe:** DS dark propio (`src/design-system/**`: primitivos, `ds.css`, `tokens.ts`). 100% del producto en DS; sin legacy.
- **Sólido.** **Riesgo:** bajo. **Falta:** nada bloqueante.

### 3.3 Frontend
- **Qué existe:** Next.js 16 App Router, React 19, Tailwind 4. Pages client/server; shells (`_public/*`, `app/_components/*` con `AppSidebarNav`/`AppMobileNav`).
- **Sólido.** **Riesgo:** flash breve en cargas async (mes/luk leen snapshot tras montar). **Falta:** pase visual móvil (manual).

### 3.4 API / Backend Logic
- **Qué existe:** 4 routes — `mes/snapshot` (GET/POST/DELETE), `debug/version`, `csp-report`, `auth/callback`. Wrapper `obs/with-handler.ts` (request-id, timing, 500 seguro).
- **Sólido** (auth+CSRF+sanitización). **Riesgo:** snapshot sin rate-limit; `with-handler` no manda a Sentry. **Falta:** rate-limit en writes.

### 3.5 Fiscal Engine
- **Qué existe (USADO):** `lib/tax/{resico,honorarios}.ts` (motores canónicos `buildMonthlyDeclaration`/`buildHonorariosDeclaration`), `lib/cfdi/**` (parser/normalize/classify/taxes/inbox/recompute), `lib/cfdi-parser.ts`.
- **Sólido** (puro, cash-basis, brackets 2026 verificados, 0-dep). **Riesgo/deuda:** `lib/tax/{regimes/*, calculators/*, breakdown-structured, cfdi-classifier, iva, regime-types, tz}` + `cfdi-sat.ts` **NO se usan en v1** (código futuro/muerto). **Falta:** TipoCambio real, conciliación REP↔PPD, estado SAT de cancelación.

### 3.6 Database / Storage
- **Qué existe:** Supabase Postgres; **1 tabla** `fiscal_month_snapshots` (agregados redactados, sin columnas rfc/uuid/xml). UNIQUE `(user_id,year,month,source)`. `profiles` NO existe.
- **Sólido en runtime** (RLS verificada). **Riesgo/deuda:** **schema/RLS NO versionado** en el repo (`supabase/migrations` vacío; aplicado por MCP) → sin reproducibilidad ni revisión en PR. **Falta:** migración versionada + el `localStorage`/`sessionStorage` del cliente (no es DB).

### 3.7 Auth / Permissions
- **Qué existe:** Supabase Auth (PKCE), password login; `proxy.ts` gating server-side (`getUser`), `auth/callback` con whitelist anti-open-redirect. RLS owner-only.
- **Sólido.** **Riesgo/deuda:** leaked-password protection **off**; AAL2/2FA y `fresh-auth` **sin callsites** (diferidos). **Falta:** SMTP, Google OAuth, 2FA real (diferidos por diseño).

### 3.8 Hosting / Cloud
- **Qué existe:** Vercel (proyecto `wedge-4r7s`). `NEXT_PUBLIC_SITE_URL` + Supabase URL/anon en env. Headers de seguridad + CSP en `next.config.ts`.
- **Sólido.** **Riesgo/deuda:** proyecto Vercel duplicado **`wedge`** roto (20 deploys ERROR, mismo repo → falla en cada push) — borrar. **Falta:** dominio propio (diferido).

### 3.9 CI/CD
- **Qué existe:** deploy por **git-push → Vercel**. Scripts `typecheck/lint/test/build` en `package.json`.
- **Deuda/ausente:** **sin GitHub Actions, sin `.husky`, sin `vercel.json`** → nada corre los tests/typecheck/lint automáticamente antes de deploy (ejecución manual disciplinada). **Falta:** gate de CI.

### 3.10 Security
- **Qué existe:** RLS owner-only, CSRF endurecido, doble red anti-PII server-side (`assertNoSensitiveFields`), headers/CSP, redacción PII en logs/Sentry, sin secretos en repo. Ver `SECURITY_ARCHITECTURE.md`.
- **Sólido — 0 P0.** **Riesgo/deuda:** snapshot sin rate-limit; CSP `unsafe-inline/eval`; leaked-password off.

### 3.11 Testing
- **Qué existe:** **417 tests** (37 archivos vitest) — parser, synthetic pack, retenciones, PUE/PPD, UsoCFDI, no-MXN, encoding, snapshot/persistence, invariante RLS, luk, entry-mode. Ver `TESTING_STRATEGY.md`.
- **Sólido en unit/integración.** **Deuda:** **8 tests legacy `*.test.ts` NO corren en `npm run test`** (incl. csrf/fresh-auth/sentry-redact/iva/tz). **Ausente:** E2E/Playwright, dos-usuarios contra RLS viva, screenshots móvil.

### 3.12 Monitoring / Logs
- **Qué existe:** **Sentry cableado** (3 runtimes + `instrumentation*.ts` + `withSentryConfig`, gated DSN, `beforeSend=redactSentryEvent`); logger JSON → Vercel logs; PostHog/Clarity (consent-gated); Vercel Analytics/Speed Insights; `/api/csp-report`.
- **Provisional.** **Riesgo/deuda:** sin `captureException` manual (errores tragados no llegan a Sentry); **sin alerting/uptime/dashboards** versionados; Vercel Analytics no respeta el toggle de consent. **Falta:** alerting proactivo.

### 3.13 Support / Ops
- **Qué existe:** `/soporte` = `mailto:hola@wedgemx.com` honesto (sin backend); `/eliminar-cuenta` = proceso ARCO **manual**.
- **Provisional.** **Falta:** automatizar soporte + borrado de cuenta (diferido; aceptable en pre-launch).

### 3.14 AI / luk
- **Qué existe:** `lib/luk/{signals,explanations,types}.ts` + `lib/fiscal-knowledge/**` — señales **deterministas** (sin LLM, sin red), explain cards con conocimiento fiscal curado.
- **Sólido.** **Riesgo:** copy fiscal mantenido a mano (riesgo de desactualización). **Falta:** knowledge base oficial versionada (futuro).

### 3.15 SAT / External Integrations (futuro)
- **Qué existe:** **nada conectado** (por diseño). `cfdi-sat.ts` existe pero no se usa; sin e.firma/CIEC/scraping/MCP.
- **Ausente (intencional).** **Falta (futuro):** SAT Lab aislado → knowledge oficial → MCP, solo tras un modelo de seguridad (ver `ROADMAP_BY_SYSTEM_AREA.md`).

## 4. Veredicto de solidez
- **Sólido:** fiscal engine usado, pipeline CFDI + privacidad, auth/RLS, snapshot, screens, DS, Sentry/analytics wiring.
- **Provisional:** error tracking (sin captura manual), CSP (unsafe-*), eliminar-cuenta/soporte manual, TipoCambio/REP↔PPD.
- **Deuda:** schema/RLS sin versionar, 8 tests fuera de CI, sin CI/husky, snapshot sin rate-limit, `lib/tax` muerto, Vercel duplicado, leaked-password off, fetch huérfano `/api/referrals`.
- Detalle priorizado en `TECHNICAL_DEBT_REGISTER.md`.
