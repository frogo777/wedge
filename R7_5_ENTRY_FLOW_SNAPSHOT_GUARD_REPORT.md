# R7.5 — Flujo de entrada: proteger el Mes Fiscal guardado (snapshot guard)

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy objetivo `https://wedge-4r7s.vercel.app`.
> Bug crítico de flujo: un usuario autenticado con Mes Fiscal guardado era empujado a diagnóstico, y
> un **draft de diagnóstico local tapaba su snapshot guardado** → sensación de perder el avance.
> Sin SAT/MCP/servicios pagos · sin rediseño grande · sin tocar `wedgemx.com` · sin cambiar RLS.
>
> **Estado: CERRADO ✅** — desplegado en `d4b8843` (live `wedge-4r7s.vercel.app`) y **verificado en vivo por
> el founder (2026-06-16)**: el nav dice "Ir a mi Mes Fiscal", `/app/mes` carga el Mes guardado, no fuerza
> diagnóstico, el diagnóstico local no reemplaza nada en automático, y logout/login mantiene el Mes guardado.

## 1. Causa raíz
En `/app/mes` ([page.tsx](src/app/app/mes/page.tsx)) el `useEffect` de carga tenía la prioridad:
**preview → draft de diagnóstico (localStorage) → snapshot DB → demo.** El **draft local se leía ANTES
que el snapshot de la cuenta**, así que un draft viejo (de un diagnóstico previo) **ocultaba** el Mes
Fiscal guardado en DB. El snapshot **nunca se borraba** (seguía en la base con RLS owner-only), pero no se
mostraba → el usuario caía en modo "diagnóstico" y sentía que había perdido su avance.

**Respuestas TAREA 1:**
1. *¿Por qué el autenticado acaba en diagnóstico?* Porque el draft local tenía prioridad sobre el snapshot.
2. *¿Qué ruta lo forzaba?* Ninguna ruta — la **prioridad de carga** en `/app/mes` (no el routing). `proxy.ts`
   ya redirige `login`/`signup` con sesión a `/app/mes` correctamente.
3. *¿Dónde se pisaba el snapshot?* No se borraba; quedaba **oculto** por el draft. (Y un guardado de
   diagnóstico posterior se volvía el "más reciente" en el `GET`, opacando el de upload.)
4. *¿Qué tenía prioridad?* preview > **draft** > snapshot > demo (orden incorrecto).
5. *¿Qué CTA elimina/reemplaza?* "Guardar" en `SaveMesPanel` (upsert) — ya pedía confirmación; el problema
   real era el **shadowing** por draft, no un borrado.

## 2. Flujo roto encontrado
Usuario hace diagnóstico (draft local) → sube ZIP ($58k preview en sessionStorage) → cierra pestaña
(sessionStorage se borra) → vuelve a entrar → `/app/mes` lee el **draft local** y muestra diagnóstico; el
snapshot guardado queda oculto. Percepción: "me empuja a diagnóstico y perdí mi Mes Fiscal".

## 3. Qué se cambió (mínimo, sin rediseño)
- **`src/lib/mes/entry-mode.ts` (NUEVO):** función PURA `chooseMesEntryMode()` con la prioridad correcta +
  `hasUnappliedDraft()`. Testeable y aislada de window/DB.
- **`src/app/app/mes/page.tsx`:** el `useEffect` ahora usa `chooseMesEntryMode` → **el snapshot DB gana al
  draft local**. Si hay snapshot Y draft, se muestra el snapshot y se ofrece usar el draft de forma
  **explícita con confirmación** (banner "guardado": *Usar este diagnóstico* / *Descartar* → al confirmar
  avisa que "reemplazará tu avance al guardar"; **nunca** reemplaza en automático ni borra el snapshot).
- **`src/app/_public/PublicNav.tsx`:** CTA según sesión — autenticado → **"Ir a mi Mes Fiscal"** (`/app/mes`);
  anónimo → "Hacer diagnóstico". `getSession()` lee cookie local (sin red), SSR-safe.
- **`src/app/app/mes/SaveMesPanel.tsx`:** copy de reemplazo más claro ("Esto reemplazará tu Mes Fiscal
  guardado con lo que ves ahora. ¿Continuar?"). El guard de confirmación ya existía. **+ callback `onSaved`**
  (R7.5) que limpia el draft local tras guardar un Mes que vino de diagnóstico → el aviso "diagnóstico sin
  aplicar" no reaparece en el siguiente reload (hallazgo de la revisión adversarial, §8).

## 4. Nueva prioridad de datos (TAREA 5)
1. **`xml-preview`** — preview de XML/ZIP activo en ESTA sesión (sessionStorage): acción intencional reciente.
2. **`guardado`** — snapshot redactado de la cuenta (DB). ← **ahora gana al draft**
3. **`diagnostico`/`expirado`** — draft local, SOLO si no hay snapshot (o si el usuario lo elige explícito).
4. **`demo`** — nada local ni guardado.

Copy por modo (ya presente): "Guardado en tu cuenta" · "Vista previa XML/ZIP" · "Desde tu diagnóstico" ·
"Datos de ejemplo".

## 5. Tests agregados
- **`src/lib/mes/entry-mode.vitest.ts` (11 tests):** snapshot+draft → `guardado` (NO `diagnostico`); snapshot
  sin draft → `guardado`; sin snapshot + draft fresco → `diagnostico`; draft viejo → `expirado`; nada → `demo`;
  preview gana a todo; `hasUnappliedDraft` true solo con snapshot+draft sin preview. Cubre TAREA 6 (1,2,3,5).
- Guard de "guardar diagnóstico con snapshot existente requiere confirmación" (TAREA 6.4): por la UI de
  `SaveMesPanel` (`confirmingUpdate`). Login→/app/mes (6.6) y CTA autenticado (6.7): `proxy.ts` + `PublicNav`
  (verificación en smoke manual del founder).

## 6. Resultado QA
typecheck **PASS** · tests **417 passed** (era 406; +11) · build **PASS** (27 rutas) · lint **10e/5w**
(baseline; 0 deuda nueva).

**Revisión adversarial multi-agente (3 lentes sobre el diff):**
- **Pérdida de datos → PASS** (0 issues): el snapshot gana al draft; nunca se reemplaza sin confirmación
  explícita (doble capa: `adoptPendingDraft` + `SaveMesPanel.confirmingUpdate`); RLS + `assertNoSensitiveFields`
  intactos.
- **Flujo de usuario nuevo → 1 P2 (CORREGIDO):** el draft local persistía tras guardar un diagnóstico
  adoptado → el aviso "sin aplicar" reaparecía. Fix: `onSaved` limpia el draft. El flujo nuevo
  (sin snapshot → diagnóstico) sigue intacto; sin redirect loops.
- **Corrección/hidratación → revisado:** el P0 "race condition" reportado es **falso positivo** (no hay
  `await` entre el guard `cancelled` y los `setState` → sin yield; React 18/19 no advierte por setState tras
  unmount). Los P1 (flash de CTA, exhaustiveness) son menores/no-bugs (ver §8).

## 7. Cómo debe probarlo el founder (smoke manual — TAREA 7)
1. **Login** → confirma que entras directo a **`/app/mes`**.
2. Confirma que ves tu **Mes Fiscal guardado** (badge "Guardado en tu cuenta"), NO diagnóstico.
3. Ve a **Home (`/`)** → el CTA del nav debe decir **"Ir a mi Mes Fiscal"** → lleva a `/app/mes`.
4. Entra a **`/diagnostico`** y complétalo → vuelve a `/app/mes`.
5. Debe seguir mostrando tu **Mes guardado** + un aviso "Tienes un diagnóstico reciente sin aplicar".
6. **Cancela** (no uses el diagnóstico) → el snapshot sigue intacto.
7. (Opcional) Solo si tú quieres: "Usar este diagnóstico" → confirma el aviso de reemplazo → luego
   "Guardar" para reemplazar a propósito.
8. Confirma que **nunca** perdiste el Mes guardado sin confirmarlo tú.

## 8. Riesgos restantes / notas
- **Flash breve demo→modo** para usuarios con draft (el `useEffect` ahora espera el `GET` de snapshot antes
  de decidir). Es neutral (no muestra el draft viejo como "respuesta"); no destructivo.
- **Fallo de red en el `GET` de snapshot:** si la red falla, se cae a draft/demo (el snapshot sigue en DB;
  recargar lo recupera). No hay pérdida de datos.
- **Multi-source snapshot:** `GET` devuelve el más reciente por `updated_at`. Si conviven snapshots de
  `diagnostic` y `xml_preview`, se muestra el último guardado. Fuera de alcance reconciliar ambos (no rompe
  nada; el usuario ve su último guardado). Documentado.
- **Flash breve del CTA en `PublicNav`** (no es hydration mismatch — server y cliente arrancan en
  `authed=false`, consistente): un usuario **logueado** que abre una página pública ve "Hacer diagnóstico"
  ~100ms antes de que `getSession()` lo cambie a "Ir a mi Mes Fiscal". Ambos enlaces funcionan; mitigarlo del
  todo requeriría leer la sesión en SSR (fuera de "sin rediseño grande"). Menor; documentado.
- **No-bugs descartados en la revisión:** chequeo de exhaustividad del union de modos (la lógica es correcta
  y la cubren 11 tests) y "decisiones de CFDI huérfanas" (comportamiento pre-existente, fuera de alcance R7.5).
- Pendientes manuales del founder (sin cambio): rotar secret Supabase + token Vercel; borrar Vercel duplicado.

## 9. Verificación en vivo (founder, 2026-06-16) — CERRADO
El founder probó el deploy `d4b8843` y confirmó:
- ✅ El nav dice **"Ir a mi Mes Fiscal"** (ya no "Hacer diagnóstico").
- ✅ `/app/mes` carga el **Mes guardado** directamente.
- ✅ **No** lo fuerza a diagnóstico.
- ✅ El diagnóstico local **no reemplaza nada** en automático.
- ✅ **Cerrar sesión y volver a entrar mantiene** el Mes guardado.

**R7.5 queda CERRADO.** El bug de flujo de entrada (snapshot tapado por draft / empuje a diagnóstico /
sensación de pérdida) está resuelto y verificado en producción.
