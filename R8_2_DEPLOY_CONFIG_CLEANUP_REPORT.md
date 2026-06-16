# R8.2 — Config mínima de deploy / OG / limpieza · Reporte

> **Fecha:** 2026-06-16 · Repo `frogo777/wedge` (rama `main`, HEAD `6f26424`) · código vivo `bf7ad47`
> · Deploy `https://wedge-4r7s.vercel.app`. Cierre de pendientes **operativos** (no código).
> Sin SAT/MCP/e.firma/CIEC/SMTP/Google/servicios pagos · sin tocar `wedgemx.com` · sin borrar `wedge-4r7s`
> · sin imprimir secretos.

## Resumen
Las 3 acciones de R8.2 (env var OG, borrar Vercel duplicado, rotar secretos) **requieren el dashboard de
Vercel/Supabase del founder** — el MCP de Vercel conectado es **solo lectura/deploy** (no tiene herramientas
para setear env vars ni borrar proyectos), y rotar/borrar son acciones destructivas/de cuenta. Aquí **verifico
el estado y dejo los pasos exactos**. No se tocó código ni `wedge-4r7s`.

## 1. Qué se cambió
- **Código/infra:** **nada** (no tengo herramienta para env vars ni para borrar proyectos; rotar es del founder).
- **Docs:** este reporte. (El fix de OG ya estaba en código desde R8: `opengraph-image.tsx` + `metadataBase`
  que lee `NEXT_PUBLIC_SITE_URL`.)

## 2. Qué se verificó
- **Git:** repo `frogo777/wedge`, rama `main`, HEAD `6f26424`, árbol **limpio**.
- **`/api/debug/version`** → `6f264244987e` (`6f26424`). Código vivo = `bf7ad47` (R8.1).
- **Proyectos Vercel** (team `team_eeEoo0ZeCPxhs1qsGblwkTui`):
  - ✅ **`wedge-4r7s`** (`prj_Xz3beokq8BNOgwd1WhleoYMi5FIj`) — **el correcto**, deploys READY, sitio vivo.
  - 🔴 **`wedge`** (`prj_I2hldkryrGHxH7jWTu2sdDcOXkAO`) — **duplicado roto**: los **20 deployments en estado
    `ERROR`** y conectado al **mismo repo** `frogo777/wedge`, así que en **cada push** dispara un build que
    falla (ruido inútil, no afecta al sitio bueno).
- **OG / metadata (el motivo de la TAREA 2):** `/opengraph-image` responde 200 (image/png, ~59 KB) en
  `wedge-4r7s`, **pero** el `<meta og:image>` del HTML apunta a
  **`https://wedge-os.vercel.app/opengraph-image`** — dominio que **da 404** (es el fallback de
  `metadataBase` porque `NEXT_PUBLIC_SITE_URL` no está seteada). → la **imagen** de la tarjeta social no
  carga al compartir (título/descripción sí). Lo arregla la TAREA 2.

## 3. Pendientes (acciones del founder — pasos exactos)

### A) `NEXT_PUBLIC_SITE_URL` (arregla OG/TikTok)
1. Vercel → proyecto **`wedge-4r7s`** → **Settings → Environment Variables → Add New**:
   - **Key:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://wedge-4r7s.vercel.app`
   - **Environments:** Production, Preview, Development.
   - **NO** marcar "Sensitive" (es pública por diseño; las `NEXT_PUBLIC_*` se inlinan en el bundle y marcarlas
     Sensitive rompe el prerender — lección de releases previos).
2. **Redeploy obligatorio:** las `NEXT_PUBLIC_*` se **inlinan en build**, así que el cambio NO aplica hasta un
   build nuevo. Vercel → **Deployments → (último) → ⋯ → Redeploy** (o haz cualquier push a `main`).
3. **Verificar** (yo lo puedo hacer si me avisas, o tú): que `https://wedge-4r7s.vercel.app/` tenga
   `og:image` apuntando a `https://wedge-4r7s.vercel.app/opengraph-image` (no a `wedge-os`).

### B) Borrar el Vercel duplicado `wedge` (NO `wedge-4r7s`)
> ⚠️ **No lo borré** (el MCP no tiene esa herramienta y es destructivo; requiere tu confirmación explícita).
1. Vercel → proyecto **`wedge`** (`prj_I2hldkryrGHxH7jWTu2sdDcOXkAO`, el que tiene **todos los deploys en
   ERROR**) → **Settings** → al final → **Delete Project** → escribe `wedge` para confirmar.
2. **Verifica dos veces que dice `wedge` y NO `wedge-4r7s`** (el sitio vivo es `wedge-4r7s`).
3. Beneficio: deja de fallar un build en cada push y limpia la cuenta.
4. *Alternativa menos drástica* (si no quieres borrarlo aún): en `wedge` → **Settings → Git → Disconnect**
   para que deje de auto-desplegar en cada push (sin borrar el proyecto).

### C) Rotación de secretos (sin imprimir valores)
Ver **`SECURITY_ROTATION_CHECKLIST.md`** (sin cambios en R8.2). **2 pendientes**, ambos del founder:
- **Supabase secret key** → Dashboard → Project Settings → API Keys → **Roll/Regenerate** (la app v1 no la
  usa; rotarla no rompe nada).
- **Vercel token `vck_…`** → Account Settings → Tokens → **Delete/Revoke** (no afecta deploys).
- `anon key` / `NEXT_PUBLIC_*` = públicas, **no** se rotan.
- **En R8.2 no se expuso ni usó ningún secreto nuevo** (todo fue lectura por MCP). Nada nuevo que rotar.

## 4. ¿Se tocó el proyecto duplicado?
**No.** Solo se leyó su estado (20 deploys ERROR, mismo repo). Borrarlo queda como acción del founder (§3B).

## 5. ¿`NEXT_PUBLIC_SITE_URL` quedó activo?
**No** (no puedo setear env vars desde aquí). Pasos exactos en §3A; tras setearla + redeploy, el OG resuelve.

## 6. Resultado smoke
| Ruta | Resultado |
|---|---|
| `/` | 200 ✅ |
| `/login` | 200 ✅ |
| `/app/mes` (sin sesión) | 307 → `/login` ✅ |
| `/icon.svg` | 200 · image/svg+xml ✅ |
| `/opengraph-image` | 200 · image/png (~59 KB) ✅ |
| `/api/debug/version` | `6f26424` ✅ |

Sin cambios funcionales. La app sigue estable para dogfooding.
