# R8.1 — Founder Smoke Polish Audit

> **Fecha:** 2026-06-16 · Deploy base `9256187` (R8). Basado en el **smoke real del founder en video** con el
> ZIP sintético. Objetivo: pulir las fricciones observadas sin features grandes.

## 1. Qué validó el video
- XML/ZIP funciona end-to-end (12 CFDIs · ingresos $58,000 · retenciones $3,575 · PPD 1 · cancelados 0).
- Fiscal Inbox abre y lista bien.
- Mes Fiscal se actualiza con las decisiones.
- luk detecta señales.
- Snapshot/entrada (R7.5) funcionan: vuelve al Mes guardado, no fuerza diagnóstico.
- Veredicto del founder: usable para dogfooding; se siente "casi listo".

## 2. Qué todavía se siente confuso
| Área | Fricción | Severidad | Acción recomendada |
|---|---|---|---|
| Estado preview/guardado | "Vista previa local" vs "Guardado" aún puede confundir; no queda claro que el preview NO reemplaza lo guardado hasta pulsar Guardar | P1 | Copy explícito en los banners de cada modo |
| Progreso | "X% listo" no explica qué lo sube ni que es informativo | P1 | Microcopy bajo el progreso |
| Confirmar/excluir CFDIs | Falta feedback claro de qué cambió (¿bajó el estimado? ¿solo reordenó?) | P1 | Feedback por decisión (excluir baja; confirmar/revisar no) |
| Guardar Mes Fiscal | El "✓ Guardado" (R8) era discreto y corto | P1 | Reforzar: visible + "puedes cerrar sesión y volver" + más tiempo |
| luk | Las señales explican pero no cierran con una acción | P1 | CTA por señal ("Revisar CFDIs"/"Volver al Mes") |
| Guía SAT / Evidencia | Tienen contenido que parece real con un botón "Pronto"; ambiguo | P2 | Badge "Próximamente" a nivel tarjeta |
| Historial | (R8 ya puso badge "Ejemplo" en demo) | — | Cubierto en R8 |
| Ansiedad fiscal | Falta cerrar con "consulta a un contador" en algún punto calmado | P2 | Línea en el disclaimer de luk |
| Mobile | Nav/logout/upload/feedback deben funcionar en móvil | P2 | Verificación (code-complete); pase visual del founder |

## 3. Qué NO se tocará
- **No SAT real / No MCP / No e.firma / No CIEC / No scraping** — el producto sigue siendo "Wedge prepara;
  tú validas en SAT".
- **No SMTP / No Google OAuth / No servicios pagos** — siguen "Pronto" honestos.
- **No rediseño grande, no cambio de arquitectura fiscal, no datos reales, no persistir XML crudo, no romper
  el paquete sintético, no tocar dominios ni `wedgemx.com`.**
- Solo microcopy, feedback, claridad de estados y CTAs pequeños.
