# Wedge — Estado actual y siguientes fases

> **Fecha:** 2026-06-15 · **Repo:** `wedge-os` → `github.com/frogo777/wedge` (branch `main`, HEAD `559efbc`).
> **Reporte de solo-lectura** (sin implementar, sin push, sin merge). Pensado para pegarse a ChatGPT.

---

## 1. Resumen ejecutivo

Wedge se **reinició desde cero** en un repo nuevo y limpio (`wedge-os`) — **sin una sola línea del Wedge
antiguo** (se dejaron atrás dashboard/autopilot/SAT-real/Syntage/Belvo/WhatsApp/Stripe/tokens-light/96
migraciones). Se replicaron solo los módulos probados de v1.

**El estado más importante: la app YA ESTÁ DESPLEGADA Y VIVA.**
- Dominio activo: **`https://wedge-4r7s.vercel.app`** — `/api/debug/version` responde **200**
  `{"commit":"559efbc","ref":"main","env":"production"}` = **exactamente el HEAD local** (sin mismatch).
- Supabase nuevo conectado real + tabla con RLS. QA local **verde**. Cero rastros legacy.

**Fase real:** *Release v1 — desplegado*. La estructura, el auth (código), la web pública, la app interna
y la persistencia están **completas y en producción**. Lo que falta NO es construir el producto, es:
**(a)** configuración de Supabase Auth (SMTP, Redirect URLs, Google, leaked-password), **(b)** limpieza de
un proyecto Vercel duplicado, **(c)** rotación de secretos que se pegaron en chat, **(d)** revisión legal,
y **(e)** —el tema de fondo— la **ingesta de datos reales (SAT)**: hoy las pantallas muestran datos de
ejemplo/locales; la sesión y la persistencia son reales, los datos fiscales aún no.

**Veredicto honesto:** listo para **founder (dogfooding)** y **usuarios de prueba controlados** (detrás de
Vercel Authentication). **NO listo para público** hasta cerrar email/Google/legal y, para ser útil de
verdad, la conexión SAT.

---

## 2. Estado Git / Deploy

**Git (`wedge-os`):**
- Rama actual: `main`. Commit: `559efbc` ("R2 completo"). Árbol **limpio** (nada sin commitear).
- **En sync con `origin/main`** (sin commits sin push).
- Historia: **3 commits, reinicio real desde cero** (`846342a` clean rebuild → `5774c10` auth → `559efbc`
  legales). **NO contiene** la historia del rebuild anterior — es un `git init` nuevo.
- Fuente de verdad ahora = `frogo777/wedge` (este repo). El viejo `patogk/wedge` (monorepo legacy) **ya no
  es la fuente de verdad**.

**Deploy (Vercel, cuenta nueva `karimgon2007-2948's projects`):**
| Proyecto | Estado | Commit | Nota |
|---|---|---|---|
| **`wedge-4r7s`** | ✅ **READY (vivo)** | `559efbc` | **Es el bueno.** `https://wedge-4r7s.vercel.app` sirve la app. Tiene las env vars. |
| `wedge` | ❌ ERROR (2 builds) | `559efbc` | Duplicado de import **sin env vars** → el build compila pero truena al prerenderizar (`@supabase/ssr` sin URL/key). **Recomendado: borrarlo.** |

- **Dominio para probar:** `https://wedge-4r7s.vercel.app`. El alias de producción es accesible; las URLs
  de deployment específico (`…-lrsmc0p82-…`) están detrás de **Vercel Authentication** (Deployment
  Protection) — normal para pre-launch.
- **Mismatch local↔deploy:** **ninguno** (deploy = `559efbc` = HEAD).
- **Errores de build:** solo en el proyecto duplicado `wedge` (env vars faltantes). `wedge-4r7s` buildea
  limpio (Sentry solo avisa "no auth token" → no sube source-maps, no rompe).

**Respuestas TAREA 1/2:** rama=`main`; commit=`559efbc`; fuente de verdad=`frogo777/wedge`; sin trabajo sin
commitear; sin commits sin push (salvo este doc); ramas viejas = solo en el repo `wedge` legacy aparte;
historia = reinicio real. Deploy vivo=`wedge-4r7s`; dominio=`wedge-4r7s.vercel.app`; corre el código actual;
sin mismatch; falta: borrar el duplicado `wedge`, definir dominio propio y la config de auth (§3/§8).

---

## 3. Estado Auth / Supabase

**Conectado real** al proyecto nuevo `awzrbeamyfvwcuzkvgvi` ("frogo777's Project", us-west-2):
- Env (nombres, sin valores): `NEXT_PUBLIC_SUPABASE_URL` ✅, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ (en
  `wedge-4r7s`; el build exitoso lo confirma). La **secret key NO se usa** (la app usa anon + URL).
- Tabla `public.fiscal_month_snapshots` creada con **RLS owner-only** (`rls_enabled=true`, 0 filas).

**Código (todo en DS, sin legacy):**
| Pieza | Estado |
|---|---|
| Login (`/login`) | ✅ contraseña (`signInWithPassword`) + magic-link + Google; → `/app/mes` |
| Signup (`/signup`) | ✅ `signUp` con `emailRedirectTo → /auth/callback?next=/onboarding` |
| Callback (`/auth/callback`) | ✅ `exchangeCodeForSession`; whitelist de `next` interno |
| Forgot/Reset | ✅ `resetPasswordForEmail → /auth/callback?next=/reset-password`; `updateUser` → `/app/mes` |
| Proxy (`src/proxy.ts`) | ✅ middleware Next 16 real; `/app` + `/onboarding` sin sesión → `/login` |
| Post-login | ✅ default `/app/mes`; **0 redirects a `/dashboard`** |
| Snapshot API | ✅ `user_id` de sesión (no del body), 401 sin sesión, CSRF same-origin (permite `wedge-*.vercel.app`) |

**Pendiente (config del founder en dashboards — no verificable desde código):**
- **Supabase Auth → URL Configuration:** Site URL + Redirect URLs deben incluir `https://wedge-4r7s.vercel.app/**`
  (y el dominio final). Sin esto, magic-link/Google/confirmación caen al Site URL equivocado.
- **Custom SMTP** (el default de Supabase es poco confiable → signup/recovery no llegan bien).
- **Google OAuth** (client configurado + redirect URI de Supabase en Google Cloud).
- **Leaked-password protection** (Authentication → Password Security).

**Respuestas TAREA 3:** (1) sí, conectado real. (2) login contraseña sí. (3) signup sí. (4) callback
correcto. (5) rutas `/app/*` protegidas sí. (6) post-login → `/app/mes`. (7) **no hay redirects a
`/dashboard`**. (8) falta: SMTP + Redirect URLs + Google + leaked-password (config dashboard), y A/B real de
2 usuarios (requiere login con contraseña).

---

## 4. Estado de producto / funcionalidades

**Rutas que existen (verificado):** público `/`, `/diagnostico`, `/precios`, `/seguridad`, `/luk`, `/faq`,
`/soporte`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding`, `/privacidad`,
`/terminos`, `/legal/uso-credenciales-sat`. App `/app/mes`, `/app/cfdis`, `/app/luk`, `/app/settings`. APIs
`/api/debug/version`, `/api/mes/snapshot`, `/api/csp-report`. (`/login/2fa` **no** — 2FA diferido.)

| Funcionalidad | Existe | Estado | Real/Demo/Temporal | Depende de | Riesgo | Qué falta | Fase |
|---|---|---|---|---|---|---|---|
| Diagnóstico sin cuenta | ✅ | listo | Real (cálculo) / Temporal | localStorage | bajo | — | OK |
| Mes Fiscal | ✅ | **parcial** | **Demo default** / Real cálculo | mock + localStorage + Supabase (snapshot) | medio | datos reales (SAT) | Producto |
| XML/ZIP upload | ✅ | listo | Real procesa / no persiste | navegador (sessionStorage) | bajo | — | OK |
| CFDI engine | ✅ | listo | Real | puro (parser 4.0) | bajo | — | OK |
| Fiscal Inbox (`/app/cfdis`) | ✅ | listo | Real / Temporal | sessionStorage | bajo | — | OK |
| Decisiones CFDI | ✅ | listo | Real / Temporal | sessionStorage | bajo | — | OK |
| Sync Inbox ↔ Mes | ✅ | listo | Real (mismo motor en vivo) | sessionStorage | bajo | — | OK |
| Persistencia snapshot | ✅ | listo | **Real** | Supabase + RLS | bajo | A/B doble-escritura | OK |
| luk signals (`/app/luk`) | ✅ | listo | Real determinístico (sin LLM) | local | bajo | — | OK |
| luk explain cards | ✅ | listo | Real determinístico | local | bajo | — | OK |
| Settings (`/app/settings`) | ✅ | listo | Real | Supabase (getUser) | bajo | (settings avanzado futuro) | OK |
| Logout | ✅ | listo | Real | Supabase signOut → `/login` | bajo | — | OK |

**La verdad central:** los **cálculos** (RESICO/Honorarios/IVA, parser CFDI) y la **persistencia** son
reales; los **datos de entrada** son ejemplo/diagnóstico/XML-local hasta que exista conexión SAT.

---

## 5. Rastros legacy / Wedge antiguo

**Resultado: LIMPIO.** Grep profundo sobre `src/` → 0 puertas legacy.

| Rastro buscado | ¿Aparece? | Dónde | Visible | Acción |
|---|---|---|---|---|
| "PROGRAMA BETA" / "beta cerrada" / "Más sobre el beta" / BetaBadge | ❌ no | — | — | nada (no existe) |
| "Ver mi dashboard" / "dashboard actual" / `/dashboard` | ❌ no | — | — | nada |
| `/beta` `/roadmap` `/bug-bounty` `/testimonios` `/referidos` | ❌ no | — | — | nada |
| "autopilot" / "contador IA" / "SAT confirmado" / "validado por SAT" | ⚠️ solo **negaciones/comentarios/test-guards** | `luk/*`, `mes/from-cfdis`, `*.vitest.ts` | no (lógica/tests) | conservar (son protecciones) |
| `wedgemx.com` | ✅ legítimo | emails de contacto en legales/seguridad/soporte + allowlist CSRF + tests | sí (emails de marca) | conservar (es la marca/contacto real) |
| OG url `https://wedgemx.com/luk` | ✅ metadata | `luk/layout.tsx:36` | no (metadata) | P3: cambiar a dominio final |
| Componentes globales legacy (AppBottomNav/QuickAddFab/BetaBadge/cookie viejo) | ❌ no montados | — | — | nada |

**Respuestas TAREA 5:** no quedan rastros legacy visibles; los hits son emails de marca + negaciones de
copy + tests; ningún link manda al Wedge viejo; ningún banner/beta/cookie legacy montado. (El cookie banner
que existe es el DS nuevo, consent de analítica, enlaza a `/privacidad`.)

---

## 6. Estructura y organización

**Una sola estructura coherente** (no hay "dos Wedges"). Chrome: `PublicShell` (header `PublicNav` + footer
`PublicFooter`) en público; `AppShell` + `AppSidebarNav` en `/app/*`; `Toast`/`CookieBanner` globales en DS.
Sin AppBottomNav/QuickAddFab/BetaBadge legacy.

- **Nav pública:** Inicio · Cómo funciona · Seguridad · luk · Precios · CTA→Diagnóstico. Footer: legales.
- **Nav app (`AppSidebarNav`):** Mes · CFDIs · luk · **Settings** (ahora enlazado, con logout) · Guía
  SAT/Historial = "Pronto".
- **Rutas que sobran:** ninguna legacy (no se copiaron). **Faltan (opcional):** enlazar `/faq` y `/soporte`
  desde el footer (hoy existen pero no están en el footer). **Deben redirigir:** ninguna (no hay legacy).

**Respuestas TAREA 6:** estructura única y limpia; nav final = la de arriba; nada sobra; falta enlazar
faq/soporte; nada que redirigir; nada que eliminar.

---

## 7. QA

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run test` | ✅ **368 passed** (32 files; incluye harness del motor RESICO/Honorarios/parser CFDI/rate-limit) |
| `npm run build` | ✅ PASS (25 rutas, 0 legacy) |
| `npm run lint` | ⚠️ **11 errores / 5 warnings** — todos `@typescript-eslint/no-explicit-any` y unused en **archivos de test copiados** (`.vitest.ts`/`.test.ts`); **0** en código de app. Deuda heredada, no bloquea. |
| Build en Vercel (`wedge-4r7s`) | ✅ READY |

**Smoke (deploy vivo):** `/api/debug/version` → 200 (commit correcto). Rutas `/app/*` sin sesión → `/login`
(proxy). `/login` carga. `/api/mes/snapshot` anónimo → 401. (El smoke autenticado A/B lo cierra el founder
con login real.)

---

## 8. Infra / apps externas

| Servicio | Estado | Necesario para | Riesgo | Prioridad | Acción |
|---|---|---|---|---|---|
| Supabase Auth/DB/RLS | ✅ conectado, tabla+RLS | core | bajo | — | listo |
| Vercel (deploy) | ✅ `wedge-4r7s` vivo | core | bajo | — | **borrar duplicado `wedge`** |
| Env vars `NEXT_PUBLIC_SUPABASE_*` | ✅ en `wedge-4r7s` | build/runtime | bajo | — | listo |
| Supabase Redirect URLs + Site URL | ⚠️ pendiente | Google/magic-link/confirmación | alto | **P0** | añadir `wedge-4r7s.vercel.app/**` + Site URL |
| Leaked-password protection | ⚠️ off (asumido) | seguridad cuentas | medio | **P0/P1** | activar en Supabase |
| SMTP / email transaccional | ❌ default Supabase | signup/recovery confiables | alto | **P1** | Custom SMTP (Resend/Postmark/SES) |
| Google OAuth | ⚠️ pendiente config | login con Google | medio | **P1** | client + redirect URI Supabase |
| Sentry | ⚙️ cableado, sin DSN | errores en prod | medio | **P1** | `NEXT_PUBLIC_SENTRY_DSN` |
| PostHog / Clarity | ⚙️ cableado, consent-gated | funnel/analítica | bajo | **P2** | `NEXT_PUBLIC_POSTHOG_*` / `CLARITY_ID` |
| `NEXT_PUBLIC_SITE_URL` | ❌ no set | canonical/sitemap/OG | bajo | **P2** | set al dominio final |
| Dominio propio (`v1.wedgemx.com`?) | ❌ no | confianza/branding | bajo | **P2** | cuando salga de `*.vercel.app` |
| Backups / uptime / rate-limit (Upstash) | ⚙️ rate-limit con fallback in-memory | continuidad/anti-abuso | medio | **P2** | Upstash + uptime monitor |
| **Rotación de secretos pegados en chat** | ⚠️ urgente | seguridad | alto | **P0** | rotar Supabase secret + token Vercel |

---

## 9. ¿En qué fase estamos?

1. **Fase real:** *Release v1 — desplegado y verificado* (la estructura/auth/público/app/persistencia están
   completas y en producción en `wedge-4r7s.vercel.app`).
2. **¿Completa?** El **código** sí. La **release** está ~90%: falta config de auth (P0/P1) + limpieza +
   rotación + revisión legal.
3. **Qué falta para cerrarla:** Redirect URLs/Site URL en Supabase, SMTP, Google OAuth, leaked-password,
   borrar el proyecto Vercel duplicado, rotar secretos, A/B real de 2 usuarios, revisión legal del aviso de
   privacidad/términos.
4. **Siguiente paso correcto:** cerrar el **P0 de Supabase Auth config** (Redirect URLs + Site URL) +
   rotación de secretos + borrar duplicado → luego SMTP/Google (P1) → luego abrir a usuarios de prueba.
5. **Qué NO hacer todavía:** SAT real, MCP, features nuevas, dominio público, marketing masivo.
6. **Qué arreglar antes de nuevas features:** config de auth (P0/P1) + el gap de datos reales (producto).
7. **¿Listo para…?**
   - **Solo founder (dogfooding):** ✅ sí, ya.
   - **Usuarios de prueba (controlados, detrás de Vercel Auth):** 🟡 casi — falta Redirect URLs + idealmente SMTP.
   - **Beta cerrada:** 🟡 no hasta SMTP + Google + leaked-password + A/B.
   - **Producción pública:** ❌ no — falta lo anterior + datos reales (SAT) + revisión legal + dominio.

---

## 10. Roadmap recomendado

| Fase | Objetivo | Entregables | Criterio de salida | Riesgo |
|---|---|---|---|---|
| **R-now — Cierre de release** | Dejar el deploy confiable | Redirect URLs+Site URL en Supabase; borrar Vercel `wedge` duplicado; rotar secretos; `NEXT_PUBLIC_SITE_URL` | login real funciona end-to-end; un solo proyecto Vercel | bajo |
| **R6 — Auth completo** | Email/Google confiables | Custom SMTP; Google OAuth; leaked-password ON; A/B 2 usuarios | signup/recovery/Google funcionan; A no ve B | medio (config externa) |
| **R7 — Observabilidad** | No volar a ciegas | Sentry DSN; PostHog/Clarity; Upstash rate-limit | errores capturados; rate-limit distribuido | bajo |
| **R8 — Usuarios de prueba** | Beta cerrada real | dominio (`v1.wedgemx.com`?); legal revisado; onboarding pulido | 5-10 testers usando sin fricción | medio |
| **Fase 7A — SAT Lab** | Diseñar ingesta SAT (sin producción) | spec descarga CFDIs; manejo e.firma/CIEC cifrado; consentimiento | diseño aprobado + sandbox | alto |
| **Fase 7B — MCP fiscal** | Capa de herramientas fiscal | MCP server + tools auditados | tools probados en sandbox | alto |
| **Fase 8 — Conexión SAT real** | Datos reales en el Mes Fiscal | descarga real consentida → reemplaza demo | un usuario ve sus CFDIs reales | alto (legal/seguridad) |

---

## 11. Qué falta (resumen)

- **P0:** Supabase Redirect URLs + Site URL; rotar secretos pegados; borrar Vercel `wedge` duplicado.
- **P1:** Custom SMTP; Google OAuth; leaked-password; Sentry DSN; A/B real; revisión legal de privacidad/términos.
- **P2:** PostHog/Clarity keys; `NEXT_PUBLIC_SITE_URL`; dominio propio; Upstash/uptime/backups; enlazar faq/soporte en footer; OG url del `luk/layout`.
- **Producto (la fase de valor):** ingesta real de CFDIs/SAT — sin ella, las pantallas son demo.

---

## 12. Prioridades

- **P0 (bloquea login real/seguridad):** Redirect URLs+Site URL · rotar secretos · borrar duplicado Vercel · (leaked-password).
- **P1 (necesario para beta real):** SMTP · Google OAuth · Sentry DSN · A/B 2 usuarios · revisión legal.
- **P2 (mejora/observabilidad):** analítica keys · dominio · Upstash · backups/uptime · faq/soporte en footer.
- **P3 (futuro):** OG url, pulidos cosméticos, SAT/MCP (fases 7-8).

---

## 13. Recomendación final (honesta)

El reinicio fue un **éxito**: hay un Wedge nuevo, limpio, coherente, **desplegado y vivo** en
`wedge-4r7s.vercel.app`, con auth real en código y persistencia con RLS — **sin rastros del Wedge antiguo**.
No digo "listo" porque **no lo está para público**: faltan los P0/P1 de configuración de auth (Redirect
URLs, SMTP, Google, leaked-password), limpiar el proyecto Vercel duplicado, **rotar los secretos que se
pegaron en el chat**, y la revisión legal. Y el salto a "útil de verdad" es la **conexión SAT** (datos
reales), que es trabajo de producto, no de release.

**Recomendación:** úsalo TÚ ya (dogfooding); cierra el P0 de Supabase Auth + rotación + limpieza esta semana;
luego SMTP/Google (P1) para abrir a un puñado de usuarios de prueba; deja SAT real para una fase dedicada.
