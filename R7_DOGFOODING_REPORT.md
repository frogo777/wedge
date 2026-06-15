# R7 — Dogfooding Report (Wedge v1)

> **Fecha:** 2026-06-15 · Deploy `https://wedge-4r7s.vercel.app` (commit `9f88599`) · Repo `frogo777/wedge`.
> **Rol:** QA lead / product tester. **Modo:** founder dogfooding sin costo (login por contraseña + usuarios
> manuales de Supabase). **Sin** arreglar nada en este turno (TAREA 11: solo detectar y clasificar).

---

## 0. Método y honestidad del alcance

- **No puedo hacer login por UI** (entrar contraseñas es acción prohibida para el agente). Por eso el
  dogfooding fue **auditoría de código + render**: se leyó qué renderiza cada pantalla en cada estado
  (vacío/cargando/lleno/error) y qué hace cada acción, **citando `file:line`**, combinado con:
  - **Smoke en vivo** de rutas (HTTP): públicas 200; `/app/*` y `/onboarding` sin sesión → **307 → `/login`**.
  - **Capa de datos** ya probada en R6B: snapshot redactado + **RLS owner-only** (B ve solo lo suyo, 0 de A).
- Se usó un barrido de **9 testers en paralelo** (un flujo c/u). **Verifiqué a mano** todos los P0/P1
  concretos (existencia de rutas/archivos, `noop`, endpoint del form).
- **Lo que NO pude observar en runtime** (requiere sesión logueada) queda marcado como *runtime-pendiente*.
- **Falso positivo descartado:** un tester reportó "no hay auth gating en `/app/*`" (buscó `middleware.ts`);
  es **falso** — Next 16 usa `proxy.ts` (export `proxy`), y el smoke en vivo da `307 → /login`. **El gating
  funciona.** (Ver §5.)

---

## 1. Checklist de dogfooding (para correr con usuarios manuales — gratis)

**Preparación (Supabase dashboard, sin email):** Authentication → Users → Add user → email + contraseña +
**Auto Confirm User**. Crea Usuario A y Usuario B.

| # | Paso | Esperado |
|---|---|---|
| 1 | A: ir a `/login`, **expandir "Prefiero usar contraseña"**, entrar | Cae en `/app/mes` |
| 2 | A: revisar Mes Fiscal | Números (ISR/IVA) coherentes; badge de modo (ejemplo/diagnóstico/guardado) visible |
| 3 | A: subir **XML/ZIP** (marcar consentimiento) | Preview local, CFDIs leídos, recalcula el mes |
| 4 | A: ir a `/app/cfdis`, decidir (Confirmar/Excluir) | Excluir baja el monto; refleja en Mes Fiscal (uploads) |
| 5 | A: `/app/luk` | Señales/explicaciones coherentes con lo subido |
| 6 | A: **guardar snapshot** (consentimiento) → recargar | Persiste; badge "Guardado en tu cuenta" |
| 7 | A: **logout** (está en `/app/settings` → Sesión) | Vuelve a `/login` |
| 8 | B: login en **incógnito** | No ve nada de A (RLS); guarda lo suyo |
| 9 | Volver a A | A sigue viendo lo suyo intacto |

**Trampas conocidas durante el dogfooding (ver §3):** no uses el botón de **magic link** ni **Google** (no
funcionan sin SMTP/OAuth — el de magic link **dice "revisa tu correo" pero no llega nada**); usa **contraseña**.
No actives MFA (rompe el login, §3 P0-2). El form de **/soporte no envía** (§3 P0-1).

---

## 2. Qué funciona bien (verificado en código + smoke + datos)

- **Login por contraseña:** UX clara (toggle, mostrar/ocultar, "olvidaste contraseña", loading), y **copy de
  error seguro** (no revela si el email existe — anti-enumeración). `login/page.tsx`.
- **Protección de rutas:** `proxy.ts` (Next 16) → sin sesión `/app/*` y `/onboarding` van a `/login` (307
  confirmado en vivo); con sesión, `/login`/`/signup` → `/app/mes`. **Open-redirect** bien defendido (guard
  replicado en 3 archivos, bloquea `//`).
- **Logout real** (`supabase.auth.signOut` con try/catch + redirect), en `settings`.
- **Snapshot:** consentimiento explícito, **redacción server-side** (whitelist + `assertNoSensitiveFields`;
  el 422 no persiste nada), RLS owner-only **probada**, copy honesto ("no guardamos tus XML").
- **XML/ZIP:** taxonomía de errores muy completa (3.3, acuse/cancelación, ZIP vacío, no-CFDI, zip-bomb caps,
  rechazo de zip anidado), **100% en el navegador**, consentido, solo guarda preview redactado.
- **Decisiones CFDI:** persistencia **real** para uploads (round-trip a Mes Fiscal); demo no persiste (y lo
  dice); estados terminales (cancelado/PPD) no decidibles.
- **luk:** determinista y **local (sin LLM/red)**, privacidad real (solo ids hasheados), copy humilde y
  consistente ("Wedge prepara; tú validas en SAT").
- **Públicas:** **cero links de navegación muertos**, `/diagnostico` es **cálculo fiscal real** (no mock),
  demo etiquetada "Datos ficticios", precios honestos (Pro $99 / Business "lanzamiento privado"), nav móvil
  construida. **Los números fiscales nunca se falsean** (motor canónico incluso en demo).

---

## 3. Errores y hallazgos — clasificados P0/P1/P2

### 🔴 P0 — arreglar antes de beta
| # | Hallazgo | Dónde | Detalle |
|---|---|---|---|
| **P0-1** | **El form de Soporte siempre falla** | `soporte/page.tsx:91` → `POST /api/soporte` (**no existe**; api/ solo tiene `csp-report`, `debug`, `mes`) | Único canal de contacto/bugs/cancelación: cada envío da 404 → toast de error; el estado "Mensaje recibido" es inalcanzable. **Verificado.** |
| **P0-2** | **MFA bloquea el login** (latente) | `login/page.tsx:154-159` → `/login/2fa` (**ruta inexistente**) | Con contraseña correcta + un factor MFA inscrito → `push('/login/2fa')` → **404**, usuario atascado. **Hoy 0 usuarios con MFA** (no se dispara), pero antes de beta: construir `/login/2fa` o quitar la rama AAL2. **No actives MFA mientras tanto.** |

### 🟠 P1 — degradan el dogfooding / arreglar antes de beta
| # | Hallazgo | Dónde | Detalle |
|---|---|---|---|
| **P1-1** | **CTAs inertes en el corazón de `/app/mes`** | `mes/page.tsx:85` `noop`, usado en `:371` (Siguiente acción), `:439` (cada "por revisar"), `:504/:527/:549` (Ver guía SAT/evidencia/historial) | La pantalla dice "esto sigue / esto falta" pero **ningún botón hace nada** (sin navegación, modal ni feedback). Se siente roto, no "pronto". Fix sugerido: cablear o renderizar como deshabilitado + "Pronto" (como el sidebar). **Verificado.** |
| **P1-2** | **Login por defecto = magic link, que falla en silencio sin SMTP** | `login/page.tsx:126-140,197-232` | El CTA primario por defecto muestra "Revisa tu correo" pero **no llega nada** (sin SMTP). "Continuar con Google" tampoco funciona sin OAuth. En modo sin costo, el camino por defecto es una trampa. Fix sugerido: default a contraseña (u ocultar email/Google hasta configurar). |
| **P1-3** | **Link ARCO muerto** "Eliminar mi cuenta" | `settings/page.tsx:116` → `/eliminar-cuenta` (**inexistente**) | 404 + **brecha LFPDPPP/ARCO** (derecho de borrado anunciado pero no funcional). **Verificado.** |
| **P1-4** | **Sin navegación móvil en `/app/*`** | `AppShell` + media queries `mes:227 / cfdis:149 / luk:82 / settings:71` ocultan el sidebar <860px, sin reemplazo | En celular no hay hamburguesa/drawer/bottom-nav → **no se puede llegar a Settings (ni logout)** desde `/app/mes`. Crítico para audiencia TikTok mobile-first. **Verificado** (`AppBottomNav` no existe). |
| **P1-5** | **Sin error/404/loading boundaries** | no existen `error.tsx`/`not-found.tsx`/`loading.tsx`/`global-error.tsx` | Cualquier 404 (p.ej. los links muertos de arriba) o error de render cae al **404/error default de Next (blanco)** → rompe el tema oscuro. **Verificado.** |
| **P1-6** | **Falso estado: demo CFDIs guardados como reales** | `mes/page.tsx:196-198` (`cfdi-demo`→`'demo'`) + `route.ts:37` acepta `demo` | Un usuario puede **guardar un snapshot hecho de CFDIs ficticios** en su cuenta; al volver, carga bajo "Guardado en tu cuenta" como si fuera real. *Sospechado en código.* Fix: no permitir guardar en modo demo. |

### 🟡 P2 — pulido / post-beta
- **Demo es el primer paint por defecto** en `/app/mes` con copy posesivo ("Tu mes…") y un **historial falso** "Mayo/Abril marcado como presentado" (está etiquetado "Datos de ejemplo", pero el historial-presentado puede engañar). `mes/page.tsx:89-90,540-547`.
- **Snapshot sin confirmación de éxito** (no hay toast; solo aparece el badge) y **401 por sesión expirada** muestra error genérico sin invitar a reloguear. `SaveMesPanel.tsx:92-103`.
- **Contradicción de copy en `/app/cfdis` (demo):** el banner dice "tus decisiones se reflejan en tu Mes Fiscal" pero el cuerpo y las tarjetas dicen lo contrario para demo. `cfdis/page.tsx:258-266`.
- **`/precios`** muestra Pro $99 con features pero sin checkout (comentario stale de Stripe `/api/billing/checkout` inexistente). `precios/page.tsx`.
- **`/seguridad` y FAQ** prometen "Configuración → Datos y privacidad" como ubicación, que no coincide con las etiquetas reales de `/app/settings`.
- **luk:** severidad `blocker` (rojo) totalmente muerta (ningún template la produce); colisión de color blocker/warning; `lib/luk/session-time.ts` es **código muerto** (no se importa en ningún lado).
- **XML/ZIP:** los avisos de parseo (multi-mes, archivos saltados) **no se persisten** con el preview → desaparecen al recargar mientras los números reducidos quedan; edge de "todos sin Fecha" → $0 + etiqueta genérica sin aviso.
- **favicon** (`layout.tsx:29` → no hay `favicon.ico`) y **opengraph-image de `/precios`** faltan → 404 de icono + preview social rota.
- **Settings** sin editar perfil/contraseña/RFC/billing; comentarios stale a `AppBottomNav`/`QuickAddFab` (purgados).
- **Snapshots múltiples:** solo se ve/borra el "último" (por `updated_at`); periodos viejos quedan invisibles/no borrables desde la UI.
- **Conteos en `/app/mes`** ("Faltan N acciones") pueden no cuadrar con las tarjetas mostradas; `readyCount` hardcodeado por modo.

---

## 4. Hallazgo refutado (NO es un error)
- **"No hay auth gating en `/app/*`"** (reportado por un tester como P1): **FALSO.** El smoke en vivo da
  `/app/mes|cfdis|luk|settings` → **307 → `/login`** sin sesión, y `proxy.ts` (export `proxy`, convención de
  Next 16) protege `/app` y `/onboarding`. El tester buscó `middleware.ts` (nombre viejo). **El gating
  funciona correctamente.**

---

## 5. Respuestas al criterio

**¿Qué funciona bien?** Login por contraseña, gating de rutas + open-redirect, logout, el pipeline
XML/ZIP→Inbox→decisiones→Mes Fiscal→snapshot con **redacción y RLS sólidas**, luk local/honesto, y las
páginas públicas (sin links muertos, cálculo real, copy sin sobre-promesas). El núcleo de valor (subir CFDIs,
ver tu mes, decidir, guardar de forma aislada por usuario) **funciona y es honesto**.

**¿Qué se siente confuso?** (1) El **login por defecto** (magic link) que "dice que sí" pero no entrega sin
SMTP. (2) Los **botones de `/app/mes` que no hacen nada** (parecen rotos). (3) El **demo posesivo** con
historial "presentado" falso. (4) Contradicción de copy en decisiones demo. (5) **Logout escondido** solo en
Settings. (6) En **móvil no hay cómo navegar** dentro de `/app`.

**¿Qué está roto?** **P0-1** form de soporte (siempre falla). **P0-2** `/login/2fa` (404 si hay MFA; latente).
**P1-3** link ARCO `/eliminar-cuenta` (404). **P1-1** CTAs `noop` del Mes Fiscal. Sin boundaries → 404s en
pantalla blanca fuera de tema.

**¿Qué falta para que un usuario de prueba lo entienda?** Que el **camino por defecto de login funcione**
(default a contraseña en modo sin costo), que los **CTAs hagan algo o digan "Pronto"**, **logout y navegación
visibles** (incl. móvil), y reducir la sensación de "datos de otro" del demo (quitar el historial
"presentado" falso).

**¿Qué arreglar antes de beta?** En orden: **P0-1** (soporte), **P0-2** (2FA o quitar rama AAL2),
**P1-1** (CTAs del Mes Fiscal), **P1-3** (ARCO/eliminar-cuenta), **P1-4** (nav móvil), **P1-5** (error/404
boundaries), **P1-2** (login default a contraseña), **P1-6** (no guardar demo como real). Los P2 son pulido.

> **Nota de alcance:** todo lo "runtime-pendiente" (qué modo ve un usuario logueado, round-trip real de
> save/load, disparo real del 404 de 2FA) requiere una sesión real; el resto está verificado en código +
> smoke + capa de datos.
