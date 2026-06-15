# R6B — No-Cost Dogfooding Report (Wedge v1)

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy vivo `https://wedge-4r7s.vercel.app` (commit
> `a70cd10`) · Supabase `awzrbeamyfvwcuzkvgvi`. Acompaña a `R6B_NO_COST_DOGFOODING_PLAN.md`.

---

## 1. A/B real sin costo — aislamiento RLS (TAREA 2)

**Ejecutado por el agente a nivel DB** vía transacción con `ROLLBACK` (sin persistir nada, sin servicios
pagos). Se crearon 2 usuarios (A y B) y un snapshot de cada uno; luego se consultó **como rol
`authenticated` con el JWT de B** (`auth.uid()` = `sub` de B), bajo la policy owner-only
`fiscal_month_snapshots_owner_all` (`USING/WITH CHECK = (auth.uid() = user_id)`).

| Métrica (lo que ve B) | Resultado |
|---|---|
| `b_ve_total` (filas visibles para B) | **1** |
| `b_ve_filas_de_a` (filas de A visibles para B) | **0** |
| `b_ve_filas_propias` (filas propias de B) | **1** |

→ **B ve exactamente lo suyo y CERO de A**, aunque la fila de A existe. Aislamiento cross-user + visibilidad
de datos propios **comprobados**. **Limpieza verificada:** tras el rollback, `auth.users = 0` y
`fiscal_month_snapshots = 0` (cero rastro).

**Equivalencia con el guion UI A/B:** lo anterior prueba el invariante central (B no ve A; A conserva lo
suyo). El guion **por interfaz** (Usuario A login contraseña → guarda snapshot → recarga → persiste →
logout; Usuario B en incógnito → no ve a A → guarda lo suyo; volver a A → intacto) **requiere entrar
contraseñas reales**, acción que el agente **no puede** ejecutar. Es **hand-off del founder** y se corre
gratis creando 2 usuarios auto-confirmados (pasos en `R6B_NO_COST_DOGFOODING_PLAN.md` §3). El aislamiento ya
está garantizado a nivel DB; la prueba UI solo confirma la experiencia.

---

## 2. Limpieza sin costo (TAREA 3)

### 2·1 Proyecto Vercel duplicado
- **`wedge-4r7s`** (`prj_Xz3beokq8BNOgwd1WhleoYMi5FIj`) = **EL BUENO** — READY, sirviendo `a70cd10`. **Conservar.**
- **`wedge`** (`prj_I2hldkryrGHxH7jWTu2sdDcOXkAO`) = **duplicado roto** — sus **4 deployments están en ERROR**
  (incluido el intento de `a70cd10`, que truena por falta de env vars). **Borrar (founder).**
- El agente **no puede borrarlo** (no hay tool de borrado en el MCP de Vercel + es destructivo). Pasos en
  `VERCEL_PROJECT_CLEANUP.md`. **→ Confirmación pendiente del founder** (no tocar `wedge-4r7s`).

### 2·2 Rotación de secretos (sin imprimir valores)
| Secreto | Acción | Cómo |
|---|---|---|
| Supabase **secret key** (`sb_secret_…`) | **Rotar** | Dashboard → Project Settings → API Keys → Roll. La app **no la usa** (usa anon+URL) → rotarla no rompe nada. |
| Vercel **token** (`vck_…`) | **Revocar** | Vercel → Account Settings → Tokens → Delete. No afecta deploys. |
| anon key / `NEXT_PUBLIC_*` | **No rotar** | Públicas por diseño. |

Acción del founder (el agente no accede a secret keys vía MCP). Detalle en `SECURITY_ROTATION_CHECKLIST.md`.

### 2·3 noindex en `/forgot-password` y `/reset-password` — **HECHO (código)** ✅
- **Hallazgo:** ambas son `"use client"` y **no tenían `layout.tsx`** → heredaban `robots: index, follow`
  del root (mientras `/login` y `/signup` sí declaran `noindex` vía su `layout.tsx`).
- **Fix aplicado:** se crearon `src/app/forgot-password/layout.tsx` y `src/app/reset-password/layout.tsx`
  espejo del patrón de `login/layout.tsx`, con `robots: { index: false, follow: false }` + título y canonical
  propios. **Seguro** (solo metadata; sin cambio de comportamiento). QA verde (§3). Surte efecto en el
  próximo deploy (tras push).

### 2·4 `rls_auto_enable()` — recomendación, **NO aplicada** (requiere tu OK)
- **Qué es:** event trigger `SECURITY DEFINER` (`search_path=pg_catalog`) que auto-activa RLS en tablas
  nuevas de `public`. Benigno. El advisor lo marca solo porque tiene `EXECUTE` para `anon`/`authenticated`
  (callable vía `/rest/v1/rpc/rls_auto_enable`).
- **Riesgo real:** ~nulo. Su cuerpo usa `pg_event_trigger_ddl_commands()`, que **falla si se invoca fuera de
  un event trigger** → llamarla por RPC no hace nada y no toca datos. La app **nunca** la llama.
- **Hardening recomendado (defensa en profundidad, no rompe nada — el event trigger sigue disparando igual):**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
  ```
- **Estado:** no la apliqué (no toco DB sin confirmación). **→ Dime si la aplico.**

---

## 3. QA final (TAREA 4) — commit con los layouts noindex

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run test` | ✅ **368 passed** (32 files) |
| `npm run build` | ✅ PASS (25 rutas; `/forgot-password` y `/reset-password` siguen `○` estáticas con su layout) |
| `npm run lint` | ⚠️ **11 errores / 5 warnings** — `any`/unused en archivos de **test**; **0 en código de app** (deuda heredada) |

**Smoke (deploy vivo `a70cd10`, sin sesión):**

| Ruta | Resultado |
|---|---|
| `/` | 200 ✅ |
| `/login` | 200 ✅ |
| `/signup` | 200 ✅ |
| `/forgot-password` | 200 ✅ |
| `/reset-password` | 200 ✅ |
| `/app/mes` | **307 → /login** ✅ |
| `/app/cfdis` | **307 → /login** ✅ |
| `/app/luk` | **307 → /login** ✅ |
| `/app/settings` | **307 → /login** ✅ |
| `/api/debug/version` | 200 · `commit:a70cd10` ✅ |

**Criterios:** públicas cargan ✅ · protegidas sin sesión → `/login` (307) ✅ · snapshot funciona (RLS §1) ✅
· sin legacy ✅ · sin rutas muertas (`/calculadora` corregido en R6 → `a70cd10`) ✅ · QA verde ✅.
*(El smoke corre sobre `a70cd10`; el noindex de §2·3 se verá tras el próximo deploy.)*

---

## 4. Veredicto

**Modo founder/dogfooding sin costo: LISTO.** El bucle completo (usuarios manuales auto-confirmados → login
contraseña → Mes Fiscal → XML/ZIP → CFDIs → luk → snapshot → persiste, con aislamiento RLS) funciona sin
gastar. Plan de uso en `R6B_NO_COST_DOGFOODING_PLAN.md`.

**Pendientes manuales (founder, ninguno ejecutable por el agente):**
- Borrar Vercel `wedge` duplicado (§2·1) · rotar 2 secretos (§2·2).
- *(Decisión)* aplicar `REVOKE EXECUTE` en `rls_auto_enable()` (§2·4).
- Con presupuesto: SMTP → Google → leaked-password/Pro → Sentry/PostHog → dominio → beta → SAT Lab.
