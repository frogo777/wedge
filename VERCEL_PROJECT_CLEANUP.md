# Vercel — Project Cleanup (R-now)

> **Fecha:** 2026-06-15 · Cuenta Vercel: `karimgon2007-2948's projects` (`team_eeEoo0ZeCPxhs1qsGblwkTui`).

## Estado de proyectos

| Proyecto | ID | Deploy | Estado | Dominio | Veredicto |
|---|---|---|---|---|---|
| **`wedge-4r7s`** | `prj_Xz3beokq8BNOgwd1WhleoYMi5FIj` | `559efbc` | ✅ **READY (vivo)** | `https://wedge-4r7s.vercel.app` | **EL BUENO — conservar.** Tiene env vars; sirve la app. |
| `wedge` | `prj_I2hldkryrGHxH7jWTu2sdDcOXkAO` | `559efbc` | ❌ **ERROR** (2 builds) | — | **Duplicado fallido — borrar.** |

## Por qué `wedge` falla

El build **compila** pero **truena al prerenderizar** porque le **faltan las env vars**
`NEXT_PUBLIC_SUPABASE_*` (sin ellas, `@supabase/ssr` lanza "URL and API key required" al generar las
páginas que crean el cliente Supabase, p.ej. `/login`). `wedge-4r7s` SÍ tiene las env vars → buildea y queda
READY. Es un import duplicado sin configurar; no se usa.

## Acción (founder — es borrado destructivo, no lo hace el agente)

Borrar el proyecto duplicado **`wedge`** (NO `wedge-4r7s`):
1. Vercel → proyecto **`wedge`** → **Settings → (bajar al final) → Delete Project**.
2. Confirmar escribiendo el nombre `wedge`.
3. **NO tocar `wedge-4r7s`** (ese es el vivo).

> El agente no borra proyectos (acción destructiva irreversible). Si prefieres conservarlo "por si acaso",
> al menos déjalo claramente marcado como duplicado y nunca le pongas dominio.

## Notas

- El **dominio de prueba** hoy es `https://wedge-4r7s.vercel.app`. Cuando definas dominio propio
  (p.ej. `v1.wedgemx.com`), asígnalo a `wedge-4r7s` y actualiza `NEXT_PUBLIC_SITE_URL` + las Redirect URLs
  de Supabase.
- Las **env vars** ya están en `wedge-4r7s` (`NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY`, texto plano).
