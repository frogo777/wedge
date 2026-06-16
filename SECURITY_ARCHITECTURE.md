# Security Architecture — Wedge v1

> **Fecha:** 2026-06-16 · `ac8496b`. Auditado en R9 (incl. verificación de RLS en Supabase vía MCP).
> **Veredicto: 0 P0.** Las 4 defensas críticas están vivas y verificadas. Detalle de deuda en `TECHNICAL_DEBT_REGISTER.md`.

## 1. Principios
- **Mínimo dato necesario:** se persiste solo un **resumen agregado redactado** del Mes Fiscal.
- **XML crudo NUNCA persistido:** la carga XML/ZIP es **client-only** (sin red, sin DB); el XML solo se parsea como texto, nunca se ejecuta ni se sube.
- **RFC/UUID redactados:** `normalizeCfdi` enmascara el RFC (`maskRfc` → `DEM******B1`) y dropea el UUID crudo (deriva un `id` hash no-sensible). `RedactedCfdi` (sessionStorage) no tiene campo UUID/RFC.
- **RLS owner-only:** la única tabla de datos (`fiscal_month_snapshots`) solo es accesible por su dueño.
- **CSRF same-origin** en writes; **headers/CSP** estrictos.
- **Sin SAT real / e.firma / CIEC:** Wedge **no declara ni paga**; no maneja credenciales SAT.

## 2. Auth
- **Supabase Auth** (`@supabase/ssr`, PKCE). `client.ts` (browser, anon), `server.ts` (cookies de `next/headers`).
- **Login por contraseña** es el único método activo; Google y magic-link **deshabilitados "Pronto"** (sin Google OAuth / SMTP).
- **Gating server-side** (`src/proxy.ts`, middleware Next 16 — confirmado cableado: Next renombra `proxy.js`→`middleware.js`): `PROTECTED=['/app','/onboarding']` → `/login` sin sesión; usa `getUser()` (valida el JWT contra Supabase, no solo lee cookie). `AUTH_PAGES` con sesión → `/app/mes`.
- **Open-redirect:** `?next=` con whitelist (`startsWith('/')`, no `//`, no `/login`/`/signup`) en `proxy.ts` y `auth/callback/route.ts` (que usa `exchangeCodeForSession` PKCE y trunca/encodea `error_description`).
- **2FA placeholder:** `/login/2fa` honesto; AAL2 y `fresh-auth.ts` (re-auth por umbral) **sin callsites** (diferidos hasta acciones sensibles).
- **Pendiente:** leaked-password protection **off** (activar en dashboard).

## 3. Database
- **1 tabla:** `fiscal_month_snapshots`. Columnas = agregados redactados (year/month/labels/montos/progress/pending_actions/risks/decisions_summary/luk_summary/privacy_level/timestamps). **Sin** columnas rfc/uuid/xml/nombre. `profiles` NO existe.
- **RLS owner-only (verificada en runtime vía MCP):** `relrowsecurity=true`; única policy `fiscal_month_snapshots_owner_all` (cmd ALL) con `USING`/`WITH CHECK = (SELECT auth.uid()) = user_id`. Probado: `set role anon` → 0 filas pese a grants de tabla (RLS es el gate efectivo).
- **Acceso:** siempre con el **cliente de sesión** (anon+JWT) → RLS aplica. `service-role` (`service.ts`) existe pero **nunca se usa en producción** (test-invariante `snapshot-service-role-invariant.vitest.ts` lo vigila).
- **Deuda P1:** schema/RLS **no versionado** en el repo (aplicado por MCP) → versionar la migración.

## 4. API
- **`POST/DELETE /api/mes/snapshot`:** `requireSameOrigin` (CSRF) → `getUser()` (401) → validación + `sanitizeFiscalMonthForPersistence` (whitelist) + `assertNoSensitiveFields` (rechaza RFC/UUID/`<cfdi`/email/teléfono → **422 determinista**, mensaje fijo). `saveFiscalMonthSnapshot` re-asserta (defensa en profundidad). DELETE acotado por `.eq(id).eq(user_id)`+RLS.
- **`GET /api/mes/snapshot`:** `getUser()` (401) + RLS (devuelve solo filas propias).
- **`/api/debug/version`:** público, solo el commit/env (no secretos).
- **`/api/csp-report`:** rate-limited (50/min/IP), trunca/loggea sin auth.
- **`with-handler.ts`:** request-id, timing, **500 genérico** (no filtra stack); `sanitizeError` oculta internals de DB en prod (allowlist).
- **Deuda P2:** snapshot sin rate-limit (acotado al owner por RLS); `with-handler` no manda a `Sentry.captureException`.

## 5. Frontend privacy
- **`sessionStorage`:** solo `RedactedCfdi[]` (sin UUID/RFC/XML) + decisiones; por-pestaña, TTL 24h, validación de forma al cargar.
- **`localStorage`:** draft de diagnóstico (sin PII fuerte, TTL 30d), consent (`wedge:consent:v1`).
- **Redacción:** RFC enmascarado, UUID dropeado para la UI, `redactCfdiForClient` expone solo campos no-PII; el item del Inbox afirma "No mostramos RFC ni UUID".
- **Warnings:** copy honesto ("no se sube", "no se guarda permanentemente", "estimado informativo").
- **Consent:** `CookieBanner` gatea PostHog/Clarity (localStorage + cross-tab). **Nota:** Vercel Analytics/SpeedInsights NO están gateados (anónimos por diseño; desalineación de copy a revisar — P2).

## 6. Secrets
- **Qué debe rotarse (founder, pendiente):** Supabase **secret/service_role key** + **token Vercel `vck_…`** (pegados en chat en una sesión previa; **no usados por el agente**). Ver `SECURITY_ROTATION_CHECKLIST.md`.
- **Qué es público (NO rotar):** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT role=anon, se inlina en el bundle por diseño); `NEXT_PUBLIC_SITE_URL`.
- **Qué nunca se imprime:** secret/service_role, tokens, RFC/UUID completos, XML crudo, CIEC/e.firma. Logger y Sentry redactan PII (email/RFC/CURP/tokens/JWT) por clave + regex.
- **Higiene:** `.gitignore` cubre `.env` y `.env*.local`; solo `.env.example` (placeholders vacíos) está trackeado. **0 secretos hardcodeados** (grep confirmado). `service-role` no se usa.
- **Headers (`next.config.ts`):** HSTS 2 años preload, X-Frame-Options DENY, nosniff, COOP/CORP same-origin, Permissions-Policy restrictiva, CSP (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `report-uri /api/csp-report`). **Deuda P2:** `script-src` con `unsafe-inline`/`unsafe-eval` (compat Next16/Sentry/PostHog).

## 7. Pendientes (pre-beta)
- **Rotar secretos + revocar token** (R10, founder).
- **Versionar schema/RLS** (R10) + test de aislamiento cross-user contra RLS viva (R11).
- **Rate-limit** en `/api/mes/snapshot` (R10/R11).
- **Sentry:** captura manual en catches críticos + verificar DSN activo en prod + alerting (R11/R14).
- **Activar leaked-password protection** (R10).
- **CSP:** migrar a nonces/hashes (R14).
- **Monitoring/alerts** (uptime, umbrales) — ausente (R14).
- **Automatizar borrado de cuenta** (ARCO) — hoy manual (R13/R14).
- **Privacy review formal** antes de registro público (R13/R14).

## Verificación R9 (resumen del gate P0)
6 agentes auditaron auth/DB/API/frontend/secrets/CSP + RLS en runtime. **`p0_security: []` en los 6.** Las 4 defensas
(gating, CSRF, RLS owner-only, doble red anti-PII) están vivas y verificadas; ninguna fuga de PII, RLS rota, secreto
en repo ni auth bypass. Lo demás es deuda priorizada (P1/P2/P3), no bloqueo de seguridad.
