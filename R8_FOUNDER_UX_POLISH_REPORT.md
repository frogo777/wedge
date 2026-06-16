# R8 — Founder UX Polish · Reporte

> **Fecha:** 2026-06-16 · Repo `frogo777/wedge` · Deploy objetivo `wedge-4r7s.vercel.app` (commit a desplegar).
> Pulido de la experiencia de dogfooding (claridad, confianza, coherencia) antes de testers/SAT.
> Sin SAT/MCP/e.firma/CIEC/SMTP/Google/servicios pagos · sin rediseño grande · sin tocar RLS ni dominios.

## 1. Resumen ejecutivo
Auditoría UX de 11 pantallas (workflow de 6 agentes) → **0 P0 de privacidad** (sólida), pero **2 P0 de
honestidad en signup**, ~9 P1 y P2. Se implementaron los **2 P0, todos los P1 accionables y los P2 de bajo
riesgo** (claridad snapshot/preview, feedback de guardado, detectado vs cobrado, historial/demo honesto,
metadata/favicon, honestidad de auth). QA verde. Wedge queda **listo para dogfooding diario**; los P3 y
algunos P2 de mayor superficie quedan documentados para después.

## 2. Qué se auditó
Públicas (`/`, `/diagnostico`, `/login`, `/signup`, `/soporte`) y app (`/app/mes`, `/app/cfdis`, `/app/luk`,
`/app/settings`, `/eliminar-cuenta`, `/login/2fa`) + estados globales (404/error/loading) + metadata/branding.
Detalle y tabla por pantalla en **`R8_FOUNDER_UX_POLISH_AUDIT.md`**.

## 3. Problemas encontrados (destacados)
- **P0** — `/signup`: botón Google **vivo** mientras `/login` lo marca "Pronto" (sin Google OAuth → error);
  verificación por correo sin SMTP → **cuenta varada** sin instrucción.
- **P1** — `/app/mes`: **sin feedback al guardar**; **USD/PPD excluidos en silencio** del monto (parece bug);
  **guardado vs preview se ven iguales**; **historial demo "presentado" falso**. `/app/cfdis`: "Ingresos
  detectados" en realidad son **cobrados**; **USD mostrado como "$" pesos**; no-MXN cuenta en conteo pero no
  en monto sin explicarlo. `/app/luk`: **no contemplaba el snapshot guardado** → decía "sin contexto" cuando
  `/app/mes` mostraba datos. **favicon y OG image 404** (este último crítico para TikTok). `/forgot-password`
  sin fallback si el correo no llega.
- **P2/P3** — copy/estados varios (PPD "por confirmar" sin botón, "Ajustes" vs "Settings", candado de
  seguridad usado para roadmap, etc.).

## 4. Cambios aplicados
**Claridad snapshot/preview (TAREA 3):** etiquetas explícitas en `/app/mes` — "Guardado en tu cuenta" vs
**"Vista previa local"** vs **"Diagnóstico local sin guardar"** vs "Datos de ejemplo"; badge sólido para
guardado vs `outline` para los volátiles (sin usar el verde reservado a "presentado"). En `/app/cfdis` se
unificó el copy "tus XML no se guardan; puedes guardar solo el resumen".

**Feedback de guardado (TAREA 2):** `SaveMesPanel` muestra **"✓ Guardado en tu cuenta"** efímero tras guardar
(antes no había ninguna señal de éxito).

**Detectado vs cobrado (TAREA 4):** en `/app/cfdis` la métrica pasó a **"Ingresos cobrados"** ("cobrado en MXN
· estimado"); el ítem muestra la **moneda** cuando no es MXN (ya no confunde USD con pesos); nota cuando hay
no-MXN ("cuentan en el total de CFDIs pero no en el monto: falta tipo de cambio"). En `/app/mes`, micro-nota
bajo las métricas cuando hay USD/PPD ("el monto del mes es lo cobrado en MXN; no incluye…"). El PPD pasó de
"por confirmar" (sin botón) a **"pendiente de complemento"**.

**Historial/demo honesto (TAREA 6):** badge **"Ejemplo"** en el historial en modo demo; quité del mock la fila
"Junio 2026" (duplicaba el mes activo). El helper "$0 confirmados" se aclaró.

**luk (TAREA 5):** `/app/luk` ahora **carga el snapshot guardado** (preview → snapshot DB → draft → vacío),
consistente con R7.5; el empty-state "sin señales" añade siguiente acción + "consúltalo con un contador".
Dedupe de copy repetido en el bloque luk de `/app/mes`.

**Honestidad de auth (P0):** `/signup` muestra **Google como "Pronto"** (igual que login); el done-state de
verificación añade **fallback a `hola@wedgemx.com`** si el correo no llega; el banner del diagnóstico pasó a
presente ("tu diagnóstico se guardó… lo retomamos"); se quitó el `fetch` muerto a `/api/email/welcome`.
`/forgot-password` añade el mismo fallback honesto a soporte.

**Empty states / "Pronto" (TAREA 8):** `/app/settings` separa el mensaje de roadmap (texto muted) del
`SecurityNotice` (candado, solo privacidad/SAT). Etiqueta unificada **"Ajustes"** (topbar/sidebar/móvil).

**Metadata/branding (TAREA 7):** `src/app/icon.svg` (favicon real, antes 404), `src/app/opengraph-image.tsx`
(tarjeta social 1200×630, antes 404 — clave para TikTok), `metadataBase` + `openGraph`/`twitter` base en
`layout.tsx`, y `/login`,`/signup` fuera del sitemap (contradecían robots).

**Archivos:** `mes/page.tsx`, `mes/SaveMesPanel.tsx`, `cfdis/page.tsx`, `cfdis/CfdiInboxItem.tsx`,
`lib/cfdi/inbox.ts`, `app/luk/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `settings/page.tsx`,
`_components/AppSidebarNav.tsx`, `layout.tsx`, `sitemap.ts`, `lib/mes/mock.ts`, + `icon.svg`,
`opengraph-image.tsx` (nuevos).

## 5. Qué quedó pendiente (⏳, documentado en el audit)
- **P3** y P2 de mayor superficie: rebrand "copiloto" en luk (decisión de voz de producto), `whatWedgeKnows`
  sensible a fuente, mostrar `confidence`, helpers de métricas de luk, banner de `cfdi-demo`, tarjeta
  Evidencia derivada de datos reales, micro-nota "no verificado contra el SAT", color del enlace
  "Eliminar cuenta", atajo a `/app/mes` en `error.tsx`.
- No se implementó nada que requiera SAT/MCP/SMTP/Google (diferido por decisión).

## 6. QA
typecheck **PASS** · tests **417 passed** · build **PASS (29 rutas**; +2 `/icon.svg` + `/opengraph-image`,
generadas estáticamente sin error) · lint **10e/5w** (baseline; **0 deuda nueva**). Smoke de endpoints:
cubierto por el build (29 rutas ○/ƒ) pre-deploy; el smoke autenticado en vivo lo hace el founder tras el
deploy (login→/app/mes, snapshot carga, upload/inbox/luk/logout). El OG image está **verificado por build**
(se genera estáticamente); conviene **ojearlo** antes de compartirlo en TikTok.

## 7. ¿Listo para dogfooding diario?
**Sí.** Los bloqueos de confianza del dogfooding están resueltos: el usuario sabe cuándo algo está guardado vs
en preview, ve feedback al guardar, entiende por qué el USD/PPD no suma, no ve historial falso como real, luk
ya no se contradice con el Mes, y el alta no deja cuentas varadas. Privacidad sólida (sin cambios). El núcleo
(parser/fiscal/snapshot/RLS/flujo de entrada) ya estaba validado (R7.x).

## 8. Qué falta antes de testers
- **Pendientes manuales del founder (seguridad/infra):** rotar Supabase secret + revocar token Vercel; borrar
  el Vercel duplicado `wedge`.
- **Decisión de producto:** ¿activar SMTP (correo automático) y/o Google OAuth? Hoy ambos son "Pronto"
  honestos; para testers fuera del founder, el alta por correo necesita SMTP o activación manual vía soporte.
- **Eyeball del OG image** antes del push de marketing (TikTok).
- P3/P2 diferidos de este audit (no bloquean dogfooding; sí pulen para testers).
- SAT real / MCP siguen congelados hasta que el dogfooding esté estable (decisión del founder).
