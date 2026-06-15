# R7.4A — Synthetic CFDI Validation Plan (diagnóstico)

> **Fecha:** 2026-06-15 · Deploy `https://wedge-4r7s.vercel.app` · Repo `frogo777/wedge` · commit vivo `f61beee`.
> El founder **no tiene CFDIs reales a la mano**. En vez de bloquearnos, creamos un **paquete sintético**
> (datos obviamente falsos) para validar parser + UX + flujo completo sin tocar datos fiscales reales.
> Sin SAT/MCP/e.firma/CIEC/scraping/servicios pagos; sin pedir XML reales; sin persistir XML crudo.

## 1. ¿En qué fase estamos realmente?
**Dogfooding founder, sin costo, sin SAT.** La app está viva y estable; el núcleo (login, Mes Fiscal, CFDI
engine, Inbox, luk, snapshot, RLS) funciona. Falta **ejercitar el camino de XML reales** — que hasta ahora no
se corrió por falta de archivos. R7.4A lo cubre con datos sintéticos.

## 2. ¿Qué quedó cerrado en R7.1 / R7.2 / R7.3?
- **R7.1:** P0/P1 baratos (soporte mailto, `/login/2fa`, CTAs noop, login por contraseña por defecto, nav
  móvil, error/404/loading boundaries, demo no-guardable como real).
- **R7.2:** auditoría del pipeline real (4 ejes) → **0 P0**, privacidad fuerte verificada; 5 P1 fiscales/parser.
- **R7.3:** corregidos esos P1 — retenciones a nivel documento (F1), deducibilidad por UsoCFDI (F3), PUE
  etiquetado como supuesto (F4), encoding ISO-8859-1/Windows-1252 (F2), `issuerName` no crudo (F6), no-MXN en
  `summarizeCfdiTaxes` (F5). +11 tests sintéticos; QA verde.

## 3. ¿Qué NO pudimos probar por falta de CFDIs reales?
La **corrida E2E en el navegador** con XML reales: que un set real se parsee, clasifique y calcule bien, y
que el preview→Inbox→decisiones→snapshot fluya con datos del founder. (Además, en la sesión de hoy se detectó
en vivo un **P1 de descubribilidad**: en modo *diagnóstico* el cargador de XML está oculto y el CTA del hero
rebota a `/app/cfdis` vacío — ver §Structural Hardening del reporte.)

## 4. ¿Qué SÍ se puede probar con CFDIs sintéticos?
- Parser CFDI 4.0 (namespaces, conceptos, impuestos, timbre, REP/pago20, nómina).
- Clasificación ingreso/gasto, retenciones (concepto y documento), PPD/REP, cancelado, egreso, USD.
- Deducibilidad por UsoCFDI (G03 vs S01), encoding ISO-8859-1, ZIP (mismo mes y multi-mes).
- Mes Fiscal (ISR/IVA/ingresos/retenciones), Inbox (decisiones), luk (señales), snapshot redactado.
- Privacidad: que no se expongan RFC/UUID/nombres crudos ni se persista XML.

## 5. ¿Qué NO se puede validar hasta tener CFDIs reales?
- **Estatus/cancelación reales del SAT** (es metadata externa; el XML no la porta → un "cancelado" sintético
  no se detecta solo por el XML).
- **Conciliación real REP↔PPD** entre comprobantes reales y su timbrado.
- **TipoCambio real** para moneda extranjera.
- Que el **RFC real del founder** se infiera bien y que los importes reales cuadren con su contabilidad.
- Indispensabilidad real de gastos (UsoCFDI es heurística, no sustituye criterio del contador).

## 6. ¿Qué falta para que Wedge sea usable por el founder?
Casi nada para uso básico: **arreglar el P1 de descubribilidad del cargador** (modo diagnóstico) para que
subir XML sea obvio. Con eso + el paquete sintético, el founder dogfoodea el flujo completo sin CFDIs reales.

## 7. ¿Qué falta para testers?
- Fix de descubribilidad del cargador (P1).
- Corrida con CFDIs reales del founder (cuando los tenga).
- **SMTP** (para signup/recovery confiables) y opcional Google OAuth — diferidos por costo.
- Rotación de secretos + borrar Vercel duplicado (pendientes manuales).

## 8. ¿Qué falta para beta pública?
Todo lo de testers + **datos SAT reales** (descarga masiva / e.firma / CIEC), revisión legal de
privacidad/términos, dominio propio, observabilidad (Sentry/PostHog), y endurecer cálculo con datos reales.

---

## Conclusión
**No estamos bloqueados.** Generamos un **paquete sintético seguro** (XML + ZIP) que el founder sube en
`/app/mes` para validar estructura, parser, UX y flujo completo. La corrida con **CFDIs reales** queda para
cuando el founder tenga XML disponibles. Entregables de R7.4A: el pack + generador + tests + guía manual +
auditoría de estructura + reporte.
