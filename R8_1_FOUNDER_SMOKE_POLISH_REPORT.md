# R8.1 — Founder Smoke Polish · Reporte

> **Fecha:** 2026-06-16 · Repo `frogo777/wedge` · base `9256187` (R8). Pulido de las fricciones del **smoke
> real del founder** (video con el ZIP sintético). Sin features grandes, sin SAT/MCP/SMTP/Google/servicios
> pagos, sin rediseño ni cambios de arquitectura fiscal.

## 1. Qué se observó en el video
La app y el flujo XML/ZIP funcionan (12 CFDIs / $58,000 / $3,575 / PPD 1), Inbox/Mes/luk responden y la
entrada/snapshot (R7.5) está bien. Fricciones de UX: estado preview vs guardado poco explícito, progreso sin
explicar, falta feedback al decidir CFDIs y al guardar, luk sin acción de cierre, módulos "Pronto" ambiguos.

## 2. Qué se corrigió
- **Estado preview/guardado (T2):** banners con copy explícito —
  - preview: **"Esta vista previa vive en este navegador. No reemplaza lo guardado hasta que pulses Guardar."**
  - guardado: **"Puedes cerrar sesión y volver sin perderlo."** (la advertencia de reemplazo ya la da
    `SaveMesPanel` al actualizar). Títulos: "Vista previa local (XML/ZIP)" / "Guardado en tu cuenta".
- **Progreso (T3):** microcopy — "El progreso sube cuando confirmas ingresos, revisas gastos y resuelves los
  pendientes del mes. Es una guía informativa, no un trámite ante el SAT."
- **Feedback de decisiones CFDI (T4):** mensaje por decisión en cada ítem — *excluir* "baja el estimado";
  *confirmar* "no cambia el estimado (ya contaba); ordena tu Inbox"; *revisar* "no cambia hasta que confirmes
  o excluyas". + aclara que vive en la sesión y no modifica el SAT. (El aviso agregado del Inbox ya existía.)
- **Feedback de guardado (T5):** confirmación reforzada — **"✓ Mes Fiscal guardado en tu cuenta. Puedes cerrar
  sesión y volver más tarde."**, más visible (bodySm) y por más tiempo (6 s). El error de guardado ya existía.
- **luk accionable (T6):** cada `SignalExplainCard` cierra con un CTA real — **"Revisar CFDIs"** (en preview)
  o **"Volver al Mes Fiscal"** (con snapshot/diagnóstico). No chat, no LLM, no no-op.
- **Módulos "Pronto" (T7):** badge **"Próximamente"** en los headers de **Guía SAT** y **Evidencia del mes**
  (antes solo el botón decía "Pronto"; el contenido parecía real). Historial demo ya tenía "Ejemplo" (R8).
- **Ansiedad fiscal (T8):** disclaimer de luk en el Mes ahora cierra con "si algo no te cuadra, **consúltalo
  con un contador**". Copy general se mantiene calmado ("estimado informativo", "por revisar", "Wedge
  prepara; tú validas en SAT"); sin rojos ni "listo para declarar" ni "validado por SAT".

**Archivos:** `mes/page.tsx`, `mes/SaveMesPanel.tsx`, `cfdis/CfdiInboxItem.tsx`, `app/luk/page.tsx`,
`app/luk/SignalExplainCard.tsx`.

## 3. Qué se dejó pendiente
- **Mobile (T9):** verificado a nivel código (nav inferior `AppMobileNav` en todas las pantallas `/app`,
  logout, upload, feedback presentes; build OK). Falta el **pase visual** del founder en su teléfono.
- Diferidos de R8 que siguen abiertos (P3 / decisiones de producto): rebrand "copiloto", `whatWedgeKnows`
  sensible a fuente, mostrar `confidence`, etc. No bloquean el dogfooding.
- Config (no código): `NEXT_PUBLIC_SITE_URL` en Vercel para que el `og:image` resuelva (heredado de R8).

## 4. QA
typecheck **PASS** · tests **417 passed** · build **PASS (29 rutas)** · lint **10e/5w** (baseline; 0 deuda
nueva). Sin cambios de arquitectura fiscal; el paquete sintético no se tocó (sigue dando 12/$58,000/$3,575).

## 5. Smoke (post-deploy, lo confirmo al desplegar)
`/login` 200 · `/app/*` sin sesión → 307 `/login` · `/api/debug/version` = commit nuevo. El smoke
autenticado (decisiones, guardado, luk) lo valida el founder.

## 6. Qué debe revisar el founder
1. Sube el ZIP → banner **"Vista previa local"** con "no reemplaza hasta Guardar".
2. Bajo el progreso, ¿se entiende **qué lo sube**?
3. En CFDIs, confirma/excluye uno → ¿el mensaje dice claro **si cambia o no el estimado**?
4. Guarda → ¿ves **"✓ Mes Fiscal guardado… puedes cerrar sesión y volver"** (visible, no fugaz)?
5. En luk, abre una señal → ¿cierra con **"Revisar CFDIs"**?
6. Guía SAT / Evidencia → ¿se ven como **"Próximamente"** (no rotas)?
7. **Móvil:** nav, logout, subir ZIP, ver feedback de guardado.

## 7. ¿R8.1 cerrado?
**Cerrado del lado de código** (audit + fixes + QA verde). Pendiente: push (con tu OK) + tu smoke visual
(incl. móvil) + la config `NEXT_PUBLIC_SITE_URL`. No bloquea el dogfooding diario.
