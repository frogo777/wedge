# Technical Debt Register — Wedge v1

> **Fecha:** 2026-06-16 · `ac8496b` · Auditado por 6 agentes (R9). **0 P0 de seguridad confirmados.**
> Severidad: **P0** seguridad/datos/uso roto · **P1** bloquea testers / confunde fuerte · **P2** polish importante · **P3** futuro.
> Fases referidas en `ROADMAP_BY_SYSTEM_AREA.md` (R10–R14, 7A–7C).

## Resumen por severidad
- **P0:** ninguno (ningún problema de seguridad/datos/uso roto). ✅
- **P1:** 4 — schema/RLS sin versionar; 8 tests (incl. seguridad) fuera de CI; sin CI/gates automáticos; rotar secretos + borrar Vercel duplicado.
- **P2:** ~8 — rate-limit snapshot, CSP unsafe-*, leaked-password off, `/api/referrals` huérfano, error-capture Sentry, Vercel Analytics sin consent-gate, `lib/tax` muerto, eliminar-cuenta manual.
- **P3:** futuro — SMTP, Google, dominio, TipoCambio, REP↔PPD, estado SAT, knowledge oficial, SAT real, MCP, monitoring/alerts, 2FA.

---

## 1. Product / UX debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| `fetch('/api/referrals')` en signup → ruta inexistente (404, try/catch) | Llamada muerta; ruido en red/consola (igual que el welcome ya removido) | P2 | Quitar el fetch (o stub no-op) | R12 |
| Flash breve demo→modo al cargar snapshot (mes/luk) | Cosmético; "parpadeo" antes de resolver el `GET` snapshot | P2 | Estado `loading` / skeleton mientras resuelve | R12 |
| Pase visual móvil no ejecutado (code-complete) | Posible bloqueo/confusión en móvil sin verificar | P2 | Smoke visual móvil (founder/Playwright) | R11/R12 |
| Copy/empty-states menores diferidos (R8 audit P3) | Pulido | P3 | Lote de copy | R12 |

## 2. Fiscal engine debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| `lib/tax/{regimes/*, calculators/*, breakdown-structured, cfdi-classifier, iva, regime-types, tz}` + `cfdi-sat.ts` **no usados por v1** | Superficie a mantener; confunde el alcance real (parece soportar arrendamiento/plataformas) | P2 | Documentar como "reserva futura" o mover fuera del bundle v1 | R12/R14 |
| **TipoCambio real ausente** (no-MXN excluido del cálculo) | Sub-reporte visible para ICP que cobra en USD (voiceover) | P3 | Extraer atributo `TipoCambio` del CFDI 4.0 para conversión informativa | 7B |
| **Conciliación REP↔PPD ausente** | Un PPD sin su REP puede quedar sin contar permanentemente | P3 | Matching de `DoctoRelacionado` (uuid) REP→PPD | 7B |
| **Estado de cancelación SAT no verificable** (no viaja en XML) | Un CFDI cancelado puede contarse como vigente | P3 | Requiere fuente SAT (SAT Lab) | 7A |
| Datos reales CFDI aún no probados (solo sintético) | Casos reales no cubiertos | P1→testers | Corrida del founder con CFDIs reales | R13 |

## 3. Auth debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| Leaked-password protection **off** en Supabase Auth | Contraseñas filtradas aceptadas | P2 | Activar en dashboard (gratis) | R10 |
| Login revela "email no confirmado" | Enumeración parcial de cuentas | P2 | Copy genérico o activar verificación | R10/R14 |
| AAL2/2FA + `fresh-auth` sin callsites (diferido) | Acciones sensibles futuras sin re-auth | P3 | Conectar `requireFreshAuth` al añadir billing/SAT/delete | 7A |
| SMTP / Google OAuth diferidos | Alta por correo varada sin activación manual; sin Google | P3 | Decidir en R14 (servicios externos) | R14 |

## 4. Database / RLS debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| **Schema + RLS NO versionado** (`supabase/migrations` vacío; aplicado por MCP) | Si se recrea el proyecto sin la RLS, el aislamiento se pierde **silenciosamente**; sin reproducibilidad/DR ni revisión en PR | **P1** | Capturar a migración versionada: `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + policy `auth.uid()=user_id` + `UNIQUE(user_id,year,month,source)` | R10 |
| Sin test de integración de aislamiento cross-user contra RLS viva | La invariante actual es estática (grep), no ejecuta SQL | P1 | Test E2E dos usuarios contra la DB | R11 |

## 5. Security / privacy debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| **Rotar Supabase secret + revocar Vercel token `vck_…`** (expuestos en chat, no usados por el agente) | Acceso total si se filtran | **P1** | `SECURITY_ROTATION_CHECKLIST.md` (founder, dashboard) | R10 |
| Sin rate-limit en `/api/mes/snapshot` (POST/DELETE) | Abuso acotado al propio owner (RLS); costo DB | P2 | `rateLimit('snapshot:'+user.id)` + cota de tamaño de arrays | R10/R11 |
| CSP con `unsafe-inline` + `unsafe-eval` | Degrada protección XSS (documentado, compat Next16/Sentry/PostHog) | P2 | Migrar a nonces/hashes cuando se pueda | R14 |
| Vercel Analytics/SpeedInsights sin consent-gate (PostHog/Clarity sí) | Desalineación consent-vs-realidad (analítica anónima corre siempre) | P2 | Gatearla o aclarar el copy del banner | R10/R12 |
| Privacy review formal pre-beta | Cumplimiento LFPDPPP/ARCO antes de registro público | P3 | Revisión de privacidad | R13/R14 |

## 6. Testing debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| **8 tests legacy `*.test.ts` NO corren en `npm run test`** (csrf, fresh-auth, sentry-redact, iva, tz, validators, consent, rate-limit-redis) | Regresión en CSRF/redacción PII/fresh-auth/IVA pasaría QA verde sin detectarse | **P1** | Añadir al harness `tests/vitest/v1-engine.test.ts` o renombrar a `.vitest.ts` | R11 |
| Sin E2E/Playwright con login real | Sesión/SSR/cookies/RLS solo validados a mano | P1 | Playwright con login real | R11 |
| Sin test dos-usuarios contra RLS viva | Aislamiento no probado contra DB real | P1 | E2E A↔B | R11 |
| Sin screenshots móvil automatizados | Responsive sin red de seguridad | P2 | Playwright `preview_resize`/screenshots | R11 |

## 7. DevOps / Vercel debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| **Sin CI (GitHub Actions) ni `.husky`** | Se puede desplegar código que no compila o con tests rojos | **P1** | GitHub Action (typecheck/test/build/lint) y/o husky pre-push | R11 |
| **Borrar proyecto Vercel duplicado `wedge`** (20 deploys ERROR, mismo repo) | Build fallido en cada push; ruido | **P1** | Borrar `wedge` (NO `wedge-4r7s`) — `VERCEL_PROJECT_CLEANUP.md` | R10 |
| Verificar env vars (`NEXT_PUBLIC_SITE_URL` ya seteada en R8.2) | OG/canonical | ✅ hecho (R8.2) | — | — |
| `.gitignore` no cubre `.env.production`/`.development` sin `.local` | Riesgo teórico si alguien crea uno con secretos | P3 | Ampliar `.gitignore` | R10 |

## 8. Monitoring / logs debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| Sentry sin `captureException` manual; `with-handler` 500 va a logger no a Sentry | Errores tragados (posthog/callback catch{}) invisibles en Sentry | P2 | `Sentry.captureException(err)` en `with-handler` y catches críticos | R11/R14 |
| Sin alerting/uptime/dashboards versionados | Observabilidad reactiva, no proactiva | P3 | Configurar alertas (Sentry/Vercel) | R14 |
| `csp_violation` a stdout, sin agregación | Nadie revisa violaciones CSP | P3 | Dashboard/alerta | R14 |
| Sentry/PostHog/Clarity dependen de env en Vercel (no en repo) | Activación no verificable en repo | P3 | Documentar/verificar en R14 | R14 |

## 9. Support / ops debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| Soporte **manual** (`mailto`, sin backend) | No escala; depende del founder | P3 | Form con backend o herramienta (post-presupuesto) | R13/R14 |
| Borrado de cuenta **manual** (sin endpoint) | No escala; ARCO manual | P3 | Endpoint de borrado + automatización | R13/R14 |

## 10. SAT / MCP future debt
| Deuda | Riesgo | Sev | Fix recomendado | Fase |
|---|---|---|---|---|
| SAT real no implementado (por diseño) | Sin validación contra el SAT | P3 | SAT Lab aislado | 7A |
| MCP fiscal no implementado (por diseño) | — | P3 | Solo tras SAT Lab + modelo de seguridad | 7C |
| Knowledge base fiscal oficial no versionada | Copy fiscal de luk mantenido a mano (riesgo de desactualización) | P3 | Fuentes oficiales + versionado + revisión humana | 7B |
| e.firma / CIEC / scraping ausentes (por diseño) | — | P3 | Diferido; nunca en la app principal sin modelo de seguridad | 7A |

---
**Nota:** R9 es solo documentación; **no se corrigió ninguna deuda** (regla de la fase). El único caso que habría
justificado tocar código era un P0 de seguridad — **no se encontró ninguno**.
