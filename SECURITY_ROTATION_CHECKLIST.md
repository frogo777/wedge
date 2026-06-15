# Security — Rotation Checklist (R-now)

> **Fecha:** 2026-06-15 · Sin imprimir valores. Acción del founder donde se indique.

## Qué se expuso (pegado en el chat de Claude → queda en el registro)

| Secreto | ¿Expuesto? | ¿Lo usó el agente? | Riesgo | Acción |
|---|---|---|---|---|
| **Supabase `sb_secret_…`** (secret key / admin) | **Sí** (pegado en chat) | **No** (toda la config de Supabase se hizo por el MCP OAuth, sin esta key) | **Alto** — salta RLS, acceso total a la DB | **ROTAR** |
| **Vercel token `vck_…`** | **Sí** (pegado en chat) | **No** (no se usó en ningún comando) | **Alto** — control total de la cuenta Vercel | **REVOCAR** |

## Qué NO rotar (no es secreto)

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (anon JWT) — **pública por diseño** (se inlina en el bundle del
  navegador). No es service_role. **No rotar** salvo que se sospeche abuso. Rotar la anon obliga a re-deploy.
- **`NEXT_PUBLIC_SUPABASE_URL`** — pública.

## Cómo rotar (founder, ~3 min)

1. **Supabase secret key:** Dashboard → Project `frogo777's Project` → **Project Settings → API Keys** →
   junto a la `secret`/`service_role` → **Roll / Regenerate**. La app v1 **no usa** la secret (usa anon+URL),
   así que rotarla **no rompe nada**. Solo actualiza la nueva si algún flujo server-side la llegara a usar.
2. **Vercel token:** Vercel → **Account Settings → Tokens** → localiza el token `vck_…` recién creado →
   **Delete / Revoke**. No afecta el deploy (los deploys no dependen de ese token personal).

## Otros (no expuestos, verificados)

- `service_role`, cookies/session tokens, Google client secret, SMTP creds, llaves privadas: **no se
  expusieron** en chat ni se imprimieron. Google/SMTP aún no configurados (no hay secretos que rotar ahí).

## Estado

- [ ] Supabase secret key — **rotar (founder)**
- [ ] Vercel token `vck_…` — **revocar (founder)**
- [x] anon key — no requiere rotación (pública)
