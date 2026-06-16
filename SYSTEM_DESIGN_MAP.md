# System Design Map — Wedge v1

> **Fecha:** 2026-06-16 · Cómo funciona Wedge desde la UX y el comportamiento (no el código). Complementa
> `SYSTEM_ARCHITECTURE.md`. Estado: dogfooding estable, verificado en vivo (R8.1).

## 1. Modelo mental del usuario
- **Mes Fiscal** (`/app/mes`) = el **resumen accionable** del mes ("esto está listo / falta / sigue"). Es la pantalla principal.
- **CFDIs** (`/app/cfdis`, Fiscal Inbox) = **revisión granular**: cada comprobante es una **decisión** (confirmar / excluir / por revisar), no una tabla.
- **luk** (`/app/luk`) = **explicación/señales** deterministas; dice qué revisar y por qué. No es chat, no declara.
- **Diagnóstico** (`/diagnostico`) = **entrada inicial** sin cuenta (5 preguntas, estimado) → se convierte en el primer Mes Fiscal.
- **Snapshot** = **persistencia** del Mes Fiscal (resumen redactado en la cuenta; sobrevive logout/login).
- **XML/ZIP** = **fuente manual** de CFDIs (alternativa a conectar SAT), procesada solo en el navegador.

Ancla transversal: **"Wedge prepara; tú validas y presentas en SAT."**

## 2. Estados principales (`/app/mes` tiene 6 modos)
| Estado | Qué es | Persistencia | ¿Guardable? | Copy / señal visual |
|---|---|---|---|---|
| **Demo** | Datos de ejemplo (mock) | ninguna | No | Badge neutral "Datos de ejemplo"; historial con badge "Ejemplo" |
| **Diagnóstico local** | Draft fresco (localStorage) | localStorage (TTL 30d) | Sí | "Diagnóstico local sin guardar" (outline) |
| **Expirado** | Draft de diagnóstico >30 días | localStorage | No | Alert warning "Diagnóstico antiguo" |
| **Vista previa XML/ZIP** | Preview de esta sesión | sessionStorage (TTL 24h) | Sí | "Vista previa local… no reemplaza lo guardado hasta que pulses Guardar" (outline) |
| **CFDIs ficticios (cfdi-demo)** | Demo de CFDIs | sessionStorage | No | Badge "CFDIs ficticios" |
| **Guardado en cuenta** | Snapshot redactado (DB) | Supabase + RLS | (Actualizar con confirmación) | Badge info "Guardado en tu cuenta… puedes cerrar sesión y volver" |
| **Error** | `error.tsx` global (DS oscuro) | — | — | Reintentar / Ir al inicio |
| **Empty state** | Inbox/luk sin datos | — | — | "Aún no hay CFDIs cargados" / "luk aún no tiene contexto" (honesto) |
| **Próximamente** | Módulos diferidos | — | — | Badge "Próximamente"/"Pronto" (Guía SAT, Evidencia, Historial, Google, magic-link) |

## 3. Jerarquía correcta de datos (R7.5, verificada)
Prioridad al entrar a `/app/mes` y `/app/luk` (`chooseMesEntryMode`, `lib/mes/entry-mode.ts`):
1. **Snapshot guardado en DB** — la autoridad; gana al draft local (un draft viejo NO debe tapar el Mes guardado).
2. **Vista previa XML/ZIP explícita de la sesión** (sessionStorage) — acción intencional reciente; se muestra para revisar/guardar.
3. **Diagnóstico local** — **solo si NO hay snapshot**, o si el usuario lo elige **explícitamente con confirmación** (nunca auto-reemplaza el snapshot).
4. **Demo** — solo si no hay nada.

> Implementación real: preview (sessionStorage) → snapshot (DB) → draft (localStorage, solo sin snapshot) → demo. El draft nunca tapa el snapshot; adoptarlo requiere confirmación.

## 4. Reglas de behavioral UX (verificadas en el código)
- **No dato sin acción:** cada métrica/sección lleva a una acción (CTA, revisar CFDIs, guardar).
- **No SAT sin contexto:** todo lo SAT está "Pronto"/explicado; nunca se promete conexión que no existe.
- **No reemplazar snapshot sin confirmación:** adoptar un draft o "Actualizar lo guardado" requiere confirmación explícita (`confirmingUseDraft` / `confirmingUpdate`).
- **No rojo salvo riesgo real:** se usa "estimado", "por revisar", "requiere revisión"; el verde se reserva para "presentado".
- **Wedge prepara, el usuario valida:** copy presente en todas las pantallas; nunca "declaración lista" ni "validado por SAT".
- **luk explica, no declara:** SecurityNotice "luk no declara, no paga ni modifica información en SAT".
- **Honestidad de estado:** preview vs guardado claramente distintos; demo etiquetado; features diferidas marcadas "Próximamente".

## 5. Mapa de pantallas (11 rutas clave)
| Ruta | Propósito | Estado | Problemas conocidos | Dogfooding | Testers |
|---|---|---|---|---|---|
| `/` | Landing; 1 acción (diagnóstico) + demo | Completa, copy honesto | Ninguno funcional | ✅ | ✅ |
| `/diagnostico` | Estimado sin cuenta (5 preguntas, sin PII) | Completa; draft → /signup | Ninguno | ✅ | ✅ |
| `/login` | Acceso por contraseña | Completa; Google/magic "Pronto" | Revela "email no confirmado" (enumeración parcial, menor) | ✅ | ✅ |
| `/signup` | Crear cuenta (correo) | Completa; medidor de fuerza, fallback a soporte | **`fetch('/api/referrals')` 404 huérfano** (try/catch, no fatal); correo automático off (mitigado) | ✅ | ✅ |
| `/soporte` | Ayuda | Completa; `mailto` honesto (sin backend) | Ninguno | ✅ | ✅ |
| `/app/mes` | Mes Fiscal accionable (6 modos) | Completa; prioridad R7.5 correcta | Flash breve demo→modo al cargar snapshot | ✅ | ✅ |
| `/app/cfdis` | Fiscal Inbox (CFDI = decisión) | Completa; cifras en vivo (mismo motor que Mes) | Ninguno | ✅ | ✅ |
| `/app/luk` | Centro de señales deterministas | Completa; carga snapshot (R8); CTA por señal | Flash "sin contexto" antes de resolver el fetch (cosmético) | ✅ | ✅ |
| `/app/settings` | Cuenta + logout | Completa; "Ajustes", logout real | Ninguno | ✅ | ✅ |
| `/eliminar-cuenta` | ARCO (borrado) | Placeholder honesto; **borrado manual** vía correo | Sin endpoint (manual) | ✅ | ✅ (manual) |
| `/login/2fa` | Placeholder si AAL2 | Placeholder honesto; 2FA diferido | Sin MFA real (0 usuarios) | ✅ | ✅ |

Otras rutas públicas implementadas: `/precios`, `/seguridad`, `/faq`, `/privacidad`, `/terminos`, `/legal/uso-credenciales-sat`, `/forgot-password`, `/reset-password`, `/onboarding`, `/luk` (público). Globales: `not-found.tsx`, `error.tsx`, `loading.tsx` (DS oscuro, honestas).

## 6. Veredicto
Wedge v1 está **listo para dogfooding del founder** y **razonablemente listo para testers cerrados**. Los flujos
son coherentes, el copy honesto y la privacidad sólida. Los pendientes para testers/beta están en
`TECHNICAL_DEBT_REGISTER.md` y `ROADMAP_BY_SYSTEM_AREA.md` (ninguno es bloqueante de uso/seguridad).
