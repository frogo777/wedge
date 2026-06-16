# Roadmap by System Area — Wedge v1

> **Fecha:** 2026-06-16. Fases futuras propuestas tras R9. **Sin features nuevas hasta cerrar deuda
> operativa/seguridad/testing.** SAT real/MCP quedan al final, solo tras un modelo de seguridad. Las fases
> se alimentan del `TECHNICAL_DEBT_REGISTER.md`. No reemplazan el criterio del founder; son una propuesta de orden.

## R9 — Architecture Map (esta fase)
- **Objetivo:** ordenar Wedge como sistema (mapa de arquitectura/diseño/datos/seguridad/testing/deuda).
- **Entregables:** `SYSTEM_ARCHITECTURE.md`, `SYSTEM_DESIGN_MAP.md`, `TECHNICAL_DEBT_REGISTER.md`, `DATA_FLOW_MAP.md`, `SECURITY_ARCHITECTURE.md`, `TESTING_STRATEGY.md`, este roadmap, `R9_ARCHITECTURE_MAP_REPORT.md`.
- **Riesgos:** ninguno (solo docs). **Salida:** docs commiteados; **0 P0** confirmado.

## R10 — Security / Ops cleanup
- **Objetivo:** cerrar los pendientes operativos/seguridad sin código de producto nuevo.
- **Entregables:** rotar Supabase secret + revocar token Vercel; **borrar Vercel duplicado `wedge`**; **versionar el schema+RLS** a una migración (`CREATE TABLE` + RLS owner-only + UNIQUE); activar leaked-password protection; (opcional) rate-limit en `/api/mes/snapshot`; ampliar `.gitignore`. `NEXT_PUBLIC_SITE_URL` ya hecho (R8.2).
- **Riesgos:** borrar el proyecto equivocado (mitigar: confirmar `wedge` ≠ `wedge-4r7s`); rotación que rompa algo (la app no usa la secret → bajo).
- **Salida:** secretos rotados; duplicado borrado; migración de schema/RLS en el repo y aplicable; advisor Supabase sin WARN.

## R11 — Testing formalization
- **Objetivo:** red de seguridad automatizada.
- **Entregables:** **CI (GitHub Action)** que corra typecheck/test/build/lint en cada push; añadir los **8 tests legacy** al harness (o renombrar); **Playwright** con login real; **test de aislamiento dos-usuarios** contra RLS viva; screenshots móvil; release checklist automatizado.
- **Riesgos:** Playwright + Supabase real requiere usuarios de prueba y cuidado de PII (usar sintético).
- **Salida:** CI verde obligatorio antes de deploy; E2E login + aislamiento + móvil cubiertos; cero tests "fantasma".

## R12 — Daily-use polish
- **Objetivo:** pulir el uso diario (continuación de R8/R8.1).
- **Entregables:** quitar `fetch('/api/referrals')` huérfano; estado loading/skeleton en mes/luk (quitar flash); pase visual móvil; lote de copy/empty-states P3; documentar/mover el `lib/tax` no usado.
- **Riesgos:** scope creep (mantenerlo en polish, sin features). **Salida:** dogfooding sin fricciones; sin llamadas muertas.

## R13 — Tester readiness (sin servicios pagos)
- **Objetivo:** abrir a testers cerrados sin SMTP/Google/pagos.
- **Entregables:** usuarios manuales auto-confirmados + guía de activación; **known limitations** documentadas para testers; soporte manual claro; (opcional) feedback form que no finja backend; corrida con CFDIs reales del founder.
- **Riesgos:** alta por correo varada sin SMTP (mitigado con activación manual); expectativas de testers. **Salida:** N testers usando Wedge con límites claros y soporte manual.

## R14 — External services decision
- **Objetivo:** decidir qué servicios externos activar (requiere presupuesto/decisión del founder).
- **Entregables (a decidir):** SMTP (correo automático), Google OAuth, Sentry DSN en prod + alerting, PostHog plan, dominio propio, monitoring/uptime, CSP a nonces, automatizar borrado de cuenta/soporte, privacy review formal.
- **Riesgos:** costo; complejidad; cada servicio agrega superficie. **Salida:** lista priorizada activada con costo aceptado; el copy "Pronto" se vuelve real donde aplique.

## Fase 7A — SAT Lab (aislado)
- **Objetivo:** investigar integración SAT **fuera de producción**, sin tocar la app principal.
- **Entregables:** entorno aislado de investigación (lectura de CFDIs/estado); modelo de seguridad para credenciales (e.firma/CIEC **nunca** en la app principal sin este modelo); diseño de conciliación REP↔PPD y validación de estado de cancelación.
- **Riesgos:** **alto** (credenciales SAT). Aislamiento estricto; nada en prod. **Salida:** prueba de concepto aislada + modelo de seguridad documentado; **sin** e.firma/CIEC/MCP en la app principal.

## Fase 7B — Fiscal knowledge oficial
- **Objetivo:** que el conocimiento fiscal (luk + cálculos) se base en fuentes oficiales versionadas.
- **Entregables:** fuentes oficiales (LISR/Resolución Miscelánea) versionadas; **revisión humana** (contador); TipoCambio informativo desde el CFDI; tablas year-aware mantenidas; deprecar copy a mano.
- **Riesgos:** responsabilidad fiscal (mantener el deslinde "estimado informativo / tú validas"). **Salida:** knowledge versionada + revisada; cálculos trazables a fuente.

## Fase 7C — MCP fiscal
- **Objetivo:** exponer/consumir capacidades fiscales vía MCP.
- **Entregables:** servidor/cliente MCP con permisos acotados.
- **Riesgos:** **muy alto** (datos fiscales + automatización). **Solo** tras 7A (SAT Lab) + 7B (knowledge) + un modelo de seguridad probado.
- **Salida:** MCP con modelo de seguridad + auditoría; nunca antes de las fases previas.

## Orden recomendado
**R10 (seguridad/ops) → R11 (testing/CI) → R12 (polish) → R13 (testers) → R14 (servicios)**, y mucho después
7A → 7B → 7C. Razón: cerrar la deuda P1 (schema sin versionar, tests fuera de CI, sin CI, rotación/duplicado)
**antes** de abrir a testers; y dejar SAT/MCP al final, gateados por seguridad. **Nada de esto inicia sin tu OK.**
