# R6 — Auth Complete Report (Wedge v1)

> **Fecha:** 2026-06-15 · Repo `wedge-os` → `github.com/frogo777/wedge` (`main`, HEAD `ed74471`; código
> desplegado `ed74471`). Deploy vivo: **`https://wedge-4r7s.vercel.app`**. Proyecto Supabase:
> `frogo777's Project` (`awzrbeamyfvwcuzkvgvi`, `us-west-2`, ACTIVE_HEALTHY).
> Objetivo R6: **cerrar Auth completo para usuarios de prueba reales**. Sin push hasta confirmación.

---

## 0. Gate previo a R6 (pendientes manuales)

| # | Item | Estado |
|---|---|---|
| 1 | Supabase secret key rotada | ⚠️ **No verificable por MCP** (las secret keys no se exponen vía MCP). Acción tuya — ver `SECURITY_ROTATION_CHECKLIST.md`. |
| 2 | Token Vercel revocado | ⚠️ **No verificable por MCP** (no hay tool de tokens). Acción tuya. |
| 3 | Vercel `wedge` duplicado borrado/archivado | ❌ **Sigue existiendo** (`prj_I2hldkryrGHxH7jWTu2sdDcOXkAO`). Acción tuya — ver `VERCEL_PROJECT_CLEANUP.md`. |
| 4 | `wedge-4r7s` intacto | ✅ **Confirmado** (`prj_Xz3beokq8BNOgwd1WhleoYMi5FIj`, READY, sirviendo `ed74471`). |

R6 (auditoría + documentación) **no depende** de #1–#3, pero quedan abiertos como acciones tuyas.

---

## 1. Auditoría del estado de Supabase Auth (observable)

- **Proyecto:** `awzrbeamyfvwcuzkvgvi`, URL `https://awzrbeamyfvwcuzkvgvi.supabase.co` (coincide con
  `NEXT_PUBLIC_SUPABASE_URL`). Postgres 17.6.
- **Usuarios:** `auth.users = 0`, `0` con email confirmado, `0` identidades, `0` factores MFA → **proyecto
  Auth en blanco** (nadie ha hecho signup todavía).
- **Keys publicables:** anon legacy JWT (`disabled:false`) + `sb_publishable_…` (`disabled:false`). La app
  usa el anon JWT en `NEXT_PUBLIC` (**público por diseño**, no se rota).
- **Advisor de seguridad** ([linter](https://supabase.com/docs/guides/database/database-linter)): 2 lints
  WARN, ambos por **una misma función** `public.rls_auto_enable()`:
  - Es un **event trigger** (`RETURNS event_trigger`, `SECURITY DEFINER`, `SET search_path = pg_catalog`)
    que **auto-activa RLS** en tablas nuevas del esquema `public`. Benigno (hardening).
  - El lint la marca porque tiene `EXECUTE` para `anon`/`authenticated` (callable vía
    `/rest/v1/rpc/rls_auto_enable`). **Riesgo práctico ≈ nulo**: su cuerpo usa
    `pg_event_trigger_ddl_commands()`, que **falla si se invoca fuera de un event trigger** — llamarla por
    RPC no hace nada y no toca datos.
  - **Hardening opcional (no aplicado, requiere tu OK):**
    `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;` — quita la
    superficie sin romper nada (la app nunca llama ese RPC).
- **Leaked-password protection:** el advisor **no** la listó como deshabilitada (ambiguo — la lectura del
  setting de GoTrue no es accesible por MCP). A confirmar/activar en dashboard (ver §4·3). **Nota: requiere
  plan Pro** (este proyecto es nuevo → confirmar plan).

---

## 2. Flujos de Auth (auditoría de código) — destino y protección open-redirect

**Destino post-login (contraseña): `/app/mes`** (vía `router.push(nextDest)`; `nextDest` = `?next=` saneado o
`/app/mes` por defecto). Mapa completo de redirects:

| Origen | Disparador | Destino |
|---|---|---|
| `proxy.ts` | Ruta protegida (`/app`, `/onboarding`) sin sesión | `/login` |
| `proxy.ts` | Auth-page con sesión + `?next=` seguro | `rawNext` (p.ej. `/app/mes`) |
| `proxy.ts` | Auth-page con sesión sin `?next=` seguro | `/app/mes` |
| `auth/callback` | Éxito PKCE (`exchangeCodeForSession`) | `next` saneado (default `/app/mes`) |
| `auth/callback` | Error de proveedor / sin `?code` / error de intercambio | `/login` (con `?error=` truncado a 200 y escapado) |
| `login` (password) | Éxito, sin MFA pendiente | `nextDest` (default `/app/mes`) |
| `login` (password) | Éxito **con MFA step-up** (`aal2` pendiente) | `/login/2fa` |
| `login` (Google / magic-link) | `redirectTo` / `emailRedirectTo` | `${origin}/auth/callback?next=…` (default `/app/mes`) |
| `signup` (email + Google) | `emailRedirectTo` / `redirectTo` | `${origin}/auth/callback?next=%2Fonboarding` |
| `forgot-password` | `resetPasswordForEmail` `redirectTo` | `${origin}/auth/callback?next=%2Freset-password` |
| `reset-password` | `updateUser({password})` éxito (tras 1800 ms) | `/app/mes` |
| `onboarding` | Botones manuales | `/diagnostico` o `/app/mes` |

- **Protección open-redirect: sólida y consistente.** El mismo guard se replica en `proxy.ts`,
  `auth/callback/route.ts` y `login/page.tsx`: exige path interno (`startsWith("/")`), **bloquea
  protocol-relative `//`**, y excluye `/login`/`/signup` (anti-loop). Cualquier valor inválido cae a
  `/app/mes`.
- **Matices de destino (task 9):** los flujos de **login** (password / Google / magic-link) y el **reset**
  caen en `/app/mes`; el **signup** (confirmación email + Google) cae en **`/onboarding`** *a propósito*
  (alta nueva onboardea primero). El `proxy.ts` **no** fuerza onboarding-completion en v1 (sólo presencia de
  sesión).
- **Magic-link:** usa `shouldCreateUser: false` (sólo login, sin alta implícita).

---

## 3. Redirects a rutas viejas (task 10)

- **Flujos de auth:** `legacyRedirectsFound: []` — el `proxy.ts` sólo redirige a `/login` y `/app/mes`
  (ambas válidas). **Cero redirects a rutas legacy.** ✅
- **Barrido adversarial de todo `src/`** (workflow de 3 agentes, múltiples ángulos): **1 hallazgo real** —
  un **link muerto** (no un redirect): `src/app/soporte/page.tsx:35` tiene
  `{ label: "Quiero revisar ISR o IVA", …, href: "/calculadora" }` renderizado como `<Link>` vivo (L137);
  `/calculadora` **no existe** en el rebuild → **404**. Todos los demás matches son falsos positivos
  (vocabulario fiscal `retenciones`/`declaraciones`/`anual`, prosa "IA mágica"/"herramientas", comentarios
  JSDoc, tags XML CFDI `pago20:Pago`, keys de analytics `calculadora_isr_used`/`DASHBOARD_ZERO_STATE`,
  fixtures de test).
  - **Fix recomendado (1 línea, NO aplicado — fuera del scope docs de R6):** repuntar ese `href` a
    `/diagnostico` (coincide con el hint "haz tu diagnóstico completo"). Pendiente de tu OK; sería commit
    aparte `fix(soporte): repuntar link muerto /calculadora → /diagnostico`.

---

## 4. Configuración de Auth para usuarios reales (pasos de dashboard — acción del founder)

> El MCP de Supabase **no** permite escribir config de GoTrue (SMTP, proveedores, password policy). Estos
> pasos son para que los ejecutes tú en el dashboard. **No pegues secretos en el chat.**

### 4·1 Custom SMTP — [docs](https://supabase.com/docs/guides/auth/auth-smtp)
**Bloqueante para signup/recovery reales:** sin SMTP custom, el SMTP integrado de Supabase **sólo entrega a
miembros de tu organización** y está fuertemente rate-limited (no sirve para usuarios de prueba externos).
1. Elige proveedor SMTP (Resend, AWS SES, Postmark, SendGrid, Brevo, ZeptoMail); obtén host, puerto (típico
   587), usuario, contraseña y un From (p.ej. `no-reply@wedge.app`).
2. Dashboard → **Authentication → Emails → SMTP Settings**
   (`/project/awzrbeamyfvwcuzkvgvi/auth/smtp`) → activa **Enable Custom SMTP**.
3. Llena Sender email/name + Host/Port/Username/Password → **Save**.
4. Verifica el dominio del From con el proveedor (**SPF/DKIM/DMARC**) para no caer en spam.
5. Sube el rate limit en `/project/awzrbeamyfvwcuzkvgvi/auth/rate-limits` (arranca en 30 msg/h).
6. Prueba un magic-link / reset y revisa **Authentication → Logs** + logs del proveedor.

### 4·2 Google OAuth — [docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
**Authorized redirect URI (exacta):** `https://awzrbeamyfvwcuzkvgvi.supabase.co/auth/v1/callback`
1. Supabase → **Authentication → Sign In / Providers → Google**
   (`/project/awzrbeamyfvwcuzkvgvi/auth/providers?provider=Google`).
2. Google Cloud Console → crea/selecciona proyecto → configura Google Auth Platform (Audience; scopes
   `openid`, `userinfo.email`, `userinfo.profile`; Branding opcional).
3. **Clients → Create OAuth client ID → Web application.**
4. **Authorized JavaScript origins:** `https://wedge-4r7s.vercel.app` + `http://localhost:3000`.
5. **Authorized redirect URIs:** `https://awzrbeamyfvwcuzkvgvi.supabase.co/auth/v1/callback`
   (local: `http://127.0.0.1:54321/auth/v1/callback`).
6. Create → copia **Client ID** y **Client Secret** (no los compartas/commitees).
7. En Supabase: activa **Enable Sign in with Google**, pega Client ID + Secret → **Save**.
8. Confirma que `https://wedge-4r7s.vercel.app/auth/callback` está en el allow-list (URL Configuration) y
   prueba `signInWithOAuth({ provider: 'google' })` end-to-end.

### 4·3 Leaked-password protection — [docs](https://supabase.com/docs/guides/auth/password-security)
**Requiere plan Pro** (confirma el plan de `awzrbeamyfvwcuzkvgvi` antes).
1. **Authentication → Sign In / Providers → Email**
   (`/project/awzrbeamyfvwcuzkvgvi/auth/providers?provider=Email`).
2. Activa **Prevent use of leaked passwords** (chequeo contra HaveIBeenPwned Pwned Passwords, k-anonymity —
   nunca se envía el password completo).
3. Endurece: longitud mínima ≥ 8 + set de caracteres fuerte (la app ya pide mín. 8 en reset).
4. Opcional: **Require reauthentication / current password** para cambios de contraseña → **Save**.

### 4·4 Site URL / Redirect URLs — [docs](https://supabase.com/docs/guides/auth/redirect-urls)
**Ya configuradas por el founder (R-now):** Site URL `https://wedge-4r7s.vercel.app` + Redirect URLs
`https://wedge-4r7s.vercel.app/**`, `http://localhost:3000/**`, `http://localhost:3100/**`.
Semántica relevante: **Site URL** es el redirect por defecto y lo usan los links de confirmación/recovery;
**Redirect URLs** es allow-list para cualquier `redirectTo`. Wildcards: `*` = secuencia sin separadores
(`.`/`/`); `**` = incluye separadores (rutas anidadas, útil para previews). Recomendado: `**` sólo para
local/preview; en prod, idealmente la ruta exacta `…/auth/callback`. *(Mejora opcional: cambiar los `/**`
por `…/auth/callback` exacto en prod.)*

---

## 5. Pruebas de Auth (tasks 5–8) — qué se verificó y qué falta

| Prueba | Estado | Detalle |
|---|---|---|
| **Signup real (5)** | 🟡 **Hand-off founder** | Lógica verificada en código (`signUp` + `emailRedirectTo=/auth/callback?next=/onboarding`). El **email de confirmación NO llega a externos** hasta configurar SMTP (§4·1). El agente no puede crear cuentas ni recibir emails. |
| **Login contraseña (6)** | 🟡 **Hand-off founder** | Flujo verificado en código → `/app/mes` (o `/login/2fa` si hay MFA). Requiere crear usuario + entrar contraseña (acción prohibida para el agente). Aislamiento RLS ya probado a nivel DB (R-now). |
| **Forgot/reset (7)** | 🟡 **Hand-off founder** | `resetPasswordForEmail → /auth/callback?next=/reset-password → updateUser → /app/mes`. Páginas renderizan OK (smoke §6). Email de recovery requiere SMTP (§4·1). |
| **Magic link (8)** | 🟡 **Sólo si se usa** | Implementado (`signInWithOtp`, `shouldCreateUser:false → /app/mes`). Requiere SMTP. Si no se va a usar en beta, dejar desactivado. |

> El agente **no ejecuta** estas pruebas E2E: requieren contraseñas reales y/o un buzón de correo, y el SMTP
> integrado no entrega a externos. Procedimiento listo para que las corras tú una vez activado SMTP.

---

## 6. Smoke de rutas (deploy `ed74471`, sin sesión)

| Ruta | HTTP | Resultado |
|---|---|---|
| `/login` | 200 | Título "Iniciar sesión — wedge", `noindex,nofollow` ✅ |
| `/signup` | 200 | Título "Crear cuenta — wedge", `noindex` ✅ |
| `/forgot-password` | 200 | Form "Recuperar contraseña"; link → `/login` ✅ |
| `/reset-password` | 200 | Form "Elige tu nueva contraseña" (mín. 8) ✅ |
| `/app/mes` (sin sesión) | 200 | HTML servido = **`/login`** (`x-matched-path: /login`) → **proxy protege la ruta** ✅ |

Sin redirects a rutas viejas en el smoke. Todas con security headers + CSP intactos.

---

## 7. QA (commit `ed74471`)

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run test` | ✅ **368 passed** (32 files) |
| `npm run build` | ✅ PASS (25 rutas; auth `○` estáticas; `ƒ Proxy` middleware activo; 0 legacy) |
| `npm run lint` | ⚠️ **11 errores / 5 warnings** — `any`/unused en archivos de **test**; **0 en código de app** (deuda heredada, no bloquea) |

---

## 8. Hallazgos y riesgos

- 🔴 **Link muerto** `/calculadora` en `/soporte` (§3) → 404. Fix de 1 línea pendiente de tu OK.
- 🟠 **SMTP custom no configurado** → signup/recovery no llegan a externos (bloqueante para usuarios de
  prueba reales por email). §4·1.
- 🟠 **Google OAuth no configurado** (§4·2) · **Leaked-password** sin confirmar + **requiere Pro** (§4·3).
- 🟡 **`/forgot-password` y `/reset-password`** heredan metadata genérica del root (`robots: index, follow`,
  título "wedge — Tu mes fiscal claro") mientras `/login`/`/signup` declaran `noindex`. Mejora menor:
  agregar `metadata` con `noindex` a esas dos páginas (no afecta Auth).
- 🟡 **`rls_auto_enable()`** expuesto a anon/authenticated (benigno; hardening opcional §1).
- 🟢 **Open-redirect:** protección sólida y consistente (§2). **RLS owner-only:** probado a nivel DB (R-now).

---

## 9. ¿R6 cerrado?

**Cerrado en lo verificable por el agente** (auditoría de flujos, smoke, QA, documentación de setup). El
**cierre operativo de Auth para usuarios reales depende de acciones de dashboard que sólo tú puedes hacer**
(SMTP, Google, leaked-password) y de pruebas E2E con contraseñas/email reales.

**Checklist de cierre R6:**
- [x] Auditar config Supabase Auth (observable) — §1
- [x] Documentar Custom SMTP — §4·1
- [x] Documentar Google OAuth (+ redirect URI) — §4·2
- [x] Documentar leaked-password (requiere Pro) — §4·3
- [x] Mapear flujos signup/login/forgot/reset/magic + open-redirect — §2, §5
- [x] Confirmar destino `/app/mes` (login) y matiz `/onboarding` (signup) — §2
- [x] Confirmar sin redirects a rutas viejas en auth (1 link muerto fuera de auth) — §3
- [x] Smoke 5 rutas + QA verde — §6, §7
- [ ] **Founder:** activar Custom SMTP (§4·1) — bloqueante para email
- [ ] **Founder:** Google OAuth (§4·2) si se usará en beta
- [ ] **Founder:** leaked-password (§4·3) — confirmar plan Pro
- [ ] **Founder:** signup/login/forgot/reset E2E reales tras SMTP (§5)
- [ ] **Founder (decisión):** ¿fix del link muerto `/calculadora`? (§3)
- [ ] **Founder (gate previo):** rotar 2 secretos + borrar Vercel `wedge` (§0)

**Pendientes manuales mínimos y honestos:** SMTP + (Google) + (leaked-password/Pro) + E2E reales; más los 3
del gate previo (rotaciones + duplicado Vercel). Nada de esto lo puede ejecutar el agente.
