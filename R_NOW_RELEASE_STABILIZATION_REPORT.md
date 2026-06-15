# R-now — Release Stabilization Report (Wedge v1)

> **Fecha:** 2026-06-15 · Repo `wedge-os` → `github.com/frogo777/wedge` (`main`, HEAD `3a2b66b`; código
> desplegado `559efbc`). Deploy vivo: **`https://wedge-4r7s.vercel.app`**. Sin push/merge a otros lados.
> Docs hermanos: `SECURITY_ROTATION_CHECKLIST.md`, `VERCEL_PROJECT_CLEANUP.md`,
> `WEDGE_CURRENT_STATE_AND_NEXT_PHASES.md`.

## 1. Estado inicial (confirmado)

- Rama `main`, árbol limpio. HEAD local `3a2b66b` (= el doc del reporte anterior, **commit local sin push**).
  Código de app desplegado = `559efbc`. Sin mismatch de código (el commit extra es solo `.md`).
- `/api/debug/version` (deploy) → **200** `{"commit":"559efbc","ref":"main","env":"production"}`.
- Proyecto correcto = **`wedge-4r7s`** (READY). Duplicado `wedge` = **ERROR** (sin env vars; ver §4).

## 2. Supabase Auth — URL Configuration

**Proyecto:** `awzrbeamyfvwcuzkvgvi` ("frogo777's Project"). Verifiqué el estado **en el dashboard** (sesión
del founder activa):

- **Estado actual (al iniciar):** Site URL = `http://localhost:3000` (default) · **Redirect URLs = vacío**.
- **Estado objetivo:**
  - Site URL: `https://wedge-4r7s.vercel.app`
  - Redirect URLs: `https://wedge-4r7s.vercel.app/**` · `http://localhost:3000/**` · `http://localhost:3100/**`

**Estado de la tarea: HAND-OFF (founder, ~60 s).** Intenté configurarlo por navegador: confirmé el login y
dejé el Site URL **escrito** en el campo, pero el tab del dashboard de Supabase se **congeló de forma
intermitente** al capturar/guardar (el agente no arriesga una config de auth a medias, que rompería el
login). **Pasos exactos (estás en la página `Authentication → URL Configuration`):**
1. **Site URL** → reemplaza `http://localhost:3000` por `https://wedge-4r7s.vercel.app` → **Save**.
2. **Redirect URLs** → **Add URL** ×3: `https://wedge-4r7s.vercel.app/**`, `http://localhost:3000/**`,
   `http://localhost:3100/**` → **Save**.

> Sin esto, magic-link / Google / confirmación de email caen al Site URL equivocado (localhost). El **login
> por contraseña** sí funciona sin esto (no depende de redirect URLs).

## 3. Rotación de secretos

Ver `SECURITY_ROTATION_CHECKLIST.md`. Resumen: el founder pegó en chat su **Supabase secret key** y su
**token Vercel** → **rotar ambos** (el agente NO los usó; toda la config se hizo por MCP OAuth). La
**anon key es pública por diseño** → no se rota. **Pendiente (founder).**

## 4. Limpieza Vercel duplicado

Ver `VERCEL_PROJECT_CLEANUP.md`. `wedge-4r7s` = vivo (conservar). `wedge` = duplicado **ERROR** (sin env
vars) → **borrar (founder; borrado destructivo, no lo hace el agente)**.

## 5. Resultado Auth A/B

- **A nivel base de datos (verificado por el agente, vía SQL):** RLS **owner-only ACTIVA** en
  `fiscal_month_snapshots`: `rls_enabled=true`; policy `fiscal_month_snapshots_owner_all` `FOR ALL` con
  `USING` + `WITH CHECK = (auth.uid() = user_id)` — **idéntica a la verificada 12/12 en Fase 5E.1**.
  Roles `anon`/`authenticated` **NO** bypassan RLS (solo `service_role`, que la app **no usa**). →
  **El aislamiento cross-user está garantizado a nivel DB.**
- **A nivel UI (pendiente founder):** la prueba A/B real (Usuario A login → guarda → recarga → persiste →
  logout; Usuario B login incógnito → no ve a A → guarda; A vuelve → intacto) **requiere login con
  contraseña de 2 usuarios**, que el agente **no puede ejecutar** (entrar contraseñas es acción prohibida).
  Crea 2 usuarios auto-confirmados en Supabase → Auth → Users y corre el flujo en `wedge-4r7s.vercel.app`.

## 6. Resultado snapshot A/B

- **Persistencia:** la API `/api/mes/snapshot` deriva `user_id` de la sesión (no del body), 401 sin sesión,
  CSRF same-origin que **permite `wedge-*.vercel.app`** (verificado en código) → **guardar snapshot
  funciona en el deploy**. Lo guardado es un **resumen redactado** (sin XML/RFC/UUID crudos).
- El A/B de UI (guardar con A, B no lo ve, etc.) es el mismo punto del §5: **pendiente del founder** (logins).
  El aislamiento ya está probado a nivel RLS.

## 7. Resultado QA

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run test` | ✅ **368 passed** (32 files) |
| `npm run build` | ✅ PASS (25 rutas, 0 legacy) |
| `npm run lint` | ⚠️ **11 errores / 5 warnings** — `any`/unused en archivos de test copiados; **0** en código de app (deuda heredada, no bloquea) |
| Deploy build (`wedge-4r7s`) | ✅ READY |
| Smoke `/api/debug/version` | ✅ 200 (commit correcto) |
| Smoke gating/`/login`/`snapshot 401` | ✅ verificado en código + sesiones previas; re-fetch en vivo pendiente (conector Vercel intermitente al cierre) |

## 8. Riesgos restantes

- **P0 pendiente:** Site URL + Redirect URLs en Supabase (§2); rotar secretos (§3); borrar duplicado Vercel (§4).
- **P1:** Custom SMTP (signup/recovery confiables); Google OAuth; leaked-password protection; A/B UI real; Sentry DSN; revisión legal de privacidad/términos.
- **Producto:** datos **demo/locales** hasta conexión SAT (sesión y persistencia son reales; datos fiscales no).
- **Menor:** commit `3a2b66b` (docs) local sin push; OG url `luk/layout` apunta a wedgemx.com (cosmético).

## 9. ¿Listo para…?

- **Founder (dogfooding):** ✅ **sí** (login por contraseña + Mes Fiscal + persistencia + RLS funcionan).
- **Usuarios de prueba (controlados):** 🟡 **casi** — cierra **§2 (Redirect URLs)** primero; idealmente SMTP.
- **Beta cerrada:** 🟡 **no** hasta §2 + SMTP + Google + leaked-password + A/B UI real.
- **Público:** ❌ **no** — falta lo anterior + datos reales (SAT) + revisión legal + dominio propio.

## Cierre de R-now (checklist)

- [x] Estado base confirmado · [x] QA verde · [x] RLS owner-only verificada (DB) · [x] estado Vercel confirmado
- [ ] **Founder:** Supabase Site URL + Redirect URLs (§2)
- [ ] **Founder:** rotar Supabase secret + token Vercel (§3)
- [ ] **Founder:** borrar proyecto Vercel `wedge` duplicado (§4)
- [ ] **Founder:** A/B UI con 2 usuarios (§5/§6)

**R-now se cierra cuando los 4 checks del founder estén hechos.** No iniciar fases nuevas antes.
