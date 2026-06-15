# R7.1 — Dogfooding Fixes Report (Wedge v1)

> **Fecha:** 2026-06-15 · Deploy `https://wedge-4r7s.vercel.app` (commit `424d3c5`) · Repo `frogo777/wedge`.
> Cierra los P0/P1 "baratos" detectados en [R7_DOGFOODING_REPORT.md](R7_DOGFOODING_REPORT.md), sin features
> grandes ni servicios pagos (sin SAT/MCP/SMTP/Google OAuth/dominio).

---

## 1. Qué se corrigió

| Tarea | Hallazgo R7 | Fix | Verificado en vivo (`424d3c5`) |
|---|---|---|---|
| **P0-1 Soporte** | `/soporte` hacía POST a `/api/soporte` inexistente → siempre fallaba | El form ahora **compone un correo** (`mailto:hola@wedgemx.com`) con motivo+mensaje; copy honesto "Mientras activamos el correo automático, escríbenos directamente". Sin falso éxito. | `/soporte` 200; botón "Escribir por correo"; **`/api/soporte` ya no se referencia**. |
| **P0-2 `/login/2fa`** | Ruta inexistente → 404 si un usuario tiene MFA | Ruta mínima DS (`src/app/login/2fa/page.tsx`): "2FA todavía no está activo en Wedge v1" + volver a `/login`. **No implementa MFA.** | `/login/2fa` **200** (antes 404); render "2FA todavía no está activo". |
| **P1-1 CTAs noop `/app/mes`** | 5 botones llamaban `noop` | "Siguiente acción" y cada "por revisar" → **navegan a `/app/cfdis`** (acción real); "Ver guía SAT / evidencia / historial" → estado **"Pronto"** deshabilitado. **Ningún CTA activo es no-op.** | Verificado en código + build; `/app/cfdis` es destino válido. |
| **P1-2 Login default** | Magic link era el default y "decía que sí" sin SMTP | **Contraseña es el método principal/único activo.** Google y enlace mágico quedan **deshabilitados** con badge "Pronto" + copy "Disponible cuando activemos el correo automático". | `/login` 200; lógica verificada (cuerpo client-rendered). |
| **P1-3 `/eliminar-cuenta`** | Link ARCO en settings → 404 | Página DS (`src/app/eliminar-cuenta/page.tsx`) con el **proceso ARCO manual** ("escríbenos a hola@wedgemx.com desde el correo de tu cuenta"). No borra cuentas automáticamente. | `/eliminar-cuenta` **200** (antes 404); render ARCO + mailto. |
| **P1-4 Nav móvil** | <860px el sidebar se ocultaba sin reemplazo → no se llegaba a Settings/logout | **`AppMobileNav`** (bottom bar fija <860px) en mes/cfdis/luk/settings con Mes · CFDIs · luk · Ajustes · **Salir** (logout real). | Verificado en código + build (rutas válidas). |
| **P1-5 Boundaries** | Sin `not-found`/`error`/`loading` → 404/errores en pantalla blanca default | `src/app/not-found.tsx`, `error.tsx`, `loading.tsx` en **DS oscuro**. | `/ruta-inexistente` → **404 con página custom oscura** ("No encontramos esta página"). |
| **P1-6 Demo no guardable** | Guardar en modo demo persistía CFDIs ficticios como reales | `canSaveMes` ahora **excluye `demo`/`cfdi-demo`**; solo se guarda XML/ZIP real (preview) o diagnóstico. | Verificado en código. |

**Smoke completo (`424d3c5`, sin sesión):** `/soporte` 200 · `/login` 200 · `/login/2fa` 200 ·
`/eliminar-cuenta` 200 · `/app/{mes,cfdis,luk,settings}` **307 → /login** · ruta inexistente **404 custom**.

---

## 2. QA

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run test` | ✅ **368 passed** (32 files) |
| `npm run build` | ✅ PASS (**27 rutas**; `/login/2fa`, `/eliminar-cuenta`, `/soporte`, `/_not-found` estáticas) |
| `npm run lint` | ✅ **10 errores / 5 warnings** — **bajó** del baseline (11e/5w); **cero deuda nueva** (todo en archivos de test/lib pre-existentes; se quitó 1 error pre-existente al alinear el `useEffect` del login con la convención del repo) |

---

## 3. Qué quedó pendiente / NO se implementó (por scope o costo)

**Decidido NO implementar ahora (correcto para modo sin costo):**
- **MFA/2FA completo** — solo el placeholder seguro; sigue diferido.
- **Backend real de soporte** (`/api/soporte` con email/storage) — preferimos `mailto:` honesto a una recepción falsa.
- **Borrado automático de cuenta** — proceso ARCO manual y verificado por correo.
- **SMTP custom / Google OAuth** — requieren servicio/config; magic-link y Google quedan deshabilitados.

**Pendiente (P2, no bloquea dogfooding — del reporte R7):**
- Demo posesivo + historial "Marcado como presentado" falso en `/app/mes` (sigue, etiquetado "Datos de ejemplo").
- En modo `diagnostico`, "Completar con XML/ZIP" se muestra "Pronto" aunque el uploader funciona en otros modos.
- Sin toast de éxito al guardar snapshot; 401 por sesión expirada da error genérico.
- Contradicción de copy en banner de decisiones demo (`/app/cfdis`); favicon/OG faltantes; `blocker` de luk muerto; conteos de `/app/mes`; comentarios stale a `AppBottomNav/QuickAddFab`.

**Acciones manuales del founder (siguen abiertas):**
- **Rotar** Supabase secret + **revocar** token Vercel (`SECURITY_ROTATION_CHECKLIST.md`).
- **Borrar** proyecto Vercel duplicado `wedge` (`VERCEL_PROJECT_CLEANUP.md`).

---

## 4. ¿Listo para founder dogfooding más estable?

**Sí, más estable.** Los bloqueos/fricciones reales del uso founder/tester están cerrados:
- El **único canal de soporte** ya no falla en silencio (mailto honesto).
- **Ningún CTA activo es no-op** y **ningún 404 en rutas sensibles** (2FA y eliminar-cuenta resueltos; 404 custom on-theme).
- **Login claro** por contraseña; no se promete correo que no llega.
- **Navegación y logout** accesibles también en **móvil**.
- **Demo no se guarda como real**; aislamiento RLS ya probado (R6B).

**Flujo de dogfooding recomendado** (sin cambios): crear usuarios auto-confirmados en Supabase → login por
contraseña → Mes Fiscal → XML/ZIP → CFDIs → luk → snapshot. Ver `R6B_NO_COST_DOGFOODING_PLAN.md`.

**No se inició** SAT, MCP, SMTP, Google OAuth, rediseño ni se tocó `wedgemx.com`.
