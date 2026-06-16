# R8 — Founder UX Polish · Auditoría

> **Fecha:** 2026-06-16 · Deploy `edd7678` (live `wedge-4r7s.vercel.app`). Auditoría UX/copy/estados de 11
> pantallas en 6 áreas (workflow multi-agente). Objetivo: que el dogfooding se sienta claro/confiable antes
> de testers/SAT. **Sin SAT/MCP/e.firma/CIEC/SMTP/Google/servicios pagos · sin rediseño grande.**
>
> **Privacidad: 0 P0** — `RedactedCfdi` sin RFC/UUID/XML; snapshot redactado + `assertNoSensitiveFields` +
> RLS owner-only; soporte = mailto honesto; ancla "Wedge prepara; tú validas en SAT" consistente.

Severidad: **P0** bloquea uso/confianza/privacidad · **P1** confunde dogfooding · **P2** polish · **P3** futuro.
Columna **R8**: ✅ = se arregla en esta fase · ⏳ = diferido (con nota).

## Públicas (/, /diagnostico, /login, /signup, /soporte)
| Pantalla | Problema | Sev | Acción | R8 |
|---|---|---|---|---|
| /signup | Botón "Continuar con Google" **vivo** (`signInWithOAuth`) pero /login lo muestra "Pronto" deshabilitado → si Google OAuth no está configurado, lleva a error | **P0** | Reemplazar por el patrón `DisabledMethod` "Pronto" igual que login | ✅ |
| /signup | Alta por correo (`signUp` + "Revisa tu correo") sin SMTP → cuenta varada; login ya traduce "email not confirmed"→"pide a soporte" | **P0** | Añadir línea honesta de fallback (mailto `hola@wedgemx.com`) en el done-state | ✅ |
| /signup | Banner desde diagnóstico dice "en la SIGUIENTE FASE podrás retomar" pero el draft YA se persiste y `/app/mes` lo consume (R7.5) | P1 | Copy a presente: "Tu diagnóstico se guardó; al crear cuenta lo retomamos" + corregir comentario stale | ✅ |
| /signup | `fetch('/api/email/welcome')` a ruta inexistente (no-fatal pero llamada muerta) | P2 | Quitar el fetch muerto | ✅ |
| /forgot-password | "Revisa tu correo" sin salvedad de SMTP → recuperación imposible sin instrucción | P1 | Fallback honesto a soporte en el done-state | ✅ |
| /login vs /signup | Asimetría de validación de password (intencional) | P3 | Sin cambio | ⏳ |
| / (home) | Ancla anti-sobrepromesa bien aplicada (verificación positiva) | P3 | Sin acción | — |

## /app/mes
| Pantalla | Problema | Sev | Acción | R8 |
|---|---|---|---|---|
| Guardar (SaveMesPanel) | **Sin feedback de éxito** tras guardar/actualizar → parece que el botón no hizo nada | **P1** | Confirmación efímera "Guardado ✓" (estado `justSaved`) | ✅ |
| Métricas "Ingresos detectados" | USD (no-MXN) y PPD se excluyen **en silencio** → parece bug de ingresos faltantes (ICP voiceover cobra en USD) | **P1** | Micro-nota cuando hay no-MXN/PPD: "No incluye X en USD ni Y por cobrar (PPD)" | ✅ |
| Banners/badges de modo | "Guardado en tu cuenta" (persistido) se ve igual que "xml-preview" (volátil) — badge `info` en ambos | **P1** | Badge `success` para guardado; distinguir de modos volátiles | ✅ |
| Historial (demo) | Mock muestra "Mayo/Abril · Marcado como presentado" como historial REAL; sin etiqueta "Ejemplo" | **P1** | Badge "Ejemplo" en historial cuando `mode==='demo'` | ✅ |
| Historial (demo) | Mock incluye "Junio 2026" (= mes activo) como fila de historial | P2 | Quitar la fila duplicada del mock | ✅ |
| Helper "$0 confirmados" | En preview/diagnóstico `incomeConfirmed=0` → "$0 confirmados" parece cero erróneo | P2 | Aclarar helper (detectado vs confirmado por ti) | ✅ |
| bloque luk (vacío) | Título y párrafo repiten idéntico "luk necesita un diagnóstico o XML/ZIP…" | P2 | Dedupe (título corto + 1 párrafo) | ✅ |
| Métricas (disclaimer SAT) | "cálculo informativo" no dice explícito "no verificado contra el SAT" | P3 | Micro-nota | ⏳ |
| cfdi-demo | Sin banner superior de "ficticios" (los otros modos sí lo tienen) | P2 | Banner para `cfdi-demo` | ⏳ (camino menor) |
| Evidencia del mes | Filas hardcodeadas del mock en todos los modos | P2 | Marcar como preview/Pronto | ⏳ |
| luk demo | luk "detecta" sobre el mock sin avisar | P3 | Prefijar "sobre datos de ejemplo" | ⏳ |
| Botones "Pronto" (Guía SAT/Evidencia/Historial) | Honestos (PreviewCta disabled + Badge "Pronto") | — | Sin acción | — |

## /app/cfdis (Fiscal Inbox)
| Pantalla | Problema | Sev | Acción | R8 |
|---|---|---|---|---|
| Resumen "Ingresos detectados" | El monto es **cobrados** (excluye PPD/no-MXN); el label dice "detectados" | **P1** | Renombrar a "Ingresos cobrados" | ✅ |
| Resumen + items | No-MXN se cuenta en `ingresosCount` pero no en el monto → sensación de inconsistencia; sin copy que lo explique | **P1** | Nota condicional "X en otra moneda (no sumadas)" | ✅ |
| CfdiInboxItem | Monto siempre formateado MXN aunque el CFDI sea USD → engaña sobre la moneda | **P1** | Mostrar moneda cuando ≠ MXN (sufijo/badge) | ✅ |
| Item PPD | Título "por confirmar" pero sin botón de confirmar (mensaje mixto) | P2 | Título "pendiente de complemento" | ✅ |
| "Vista previa local" | "no se guarda" vs "puedes guardar el resumen" repartido → se lee contradictorio | P2 | Unificar el matiz (XML no / resumen sí) | ✅ |
| Retenciones | Mismo riesgo de divergencia conteo/monto en no-MXN | P2 | Cubierto al resolver la nota de moneda | ✅ (deriva) |
| Empty state / "detectado" triple sentido | Honesto / ruido semántico menor | P3 | — | ⏳ |
| Privacidad (sin RFC/UUID) | Correcto | — | Sin acción | — |

## /app/luk
| Pantalla | Problema | Sev | Acción | R8 |
|---|---|---|---|---|
| Carga | **No contempla el snapshot guardado** (solo preview/draft) → si hay mes guardado sin preview/draft, luk dice "no tengo contexto" y contradice /app/mes (R7.5) | **P1** | 3ª rama: cargar snapshot → `buildLukSignals({month})` | ✅ |
| empty-state "sin señales" | No dice siguiente acción ni cuándo ver contador | P2 | Añadir 1 línea de siguiente acción | ✅ |
| Header "copiloto fiscal" | "Copiloto" evoca chat/IA que el producto niega | P2 | Aclarar "detecta señales, no es chat" (sin rebrand) | ✅ (light) |
| `whatWedgeKnows` hardcode "este navegador" | Será falso con snapshot server | P2 | Hacerlo sensible a fuente | ⏳ (con la rama snapshot) |
| confidence nunca mostrado / eco summary↔concepto / helpers vagos / copy-debt templates | Polish | P3 | — | ⏳ |

## /app/settings, /eliminar-cuenta, /login/2fa, estados globales
| Pantalla | Problema | Sev | Acción | R8 |
|---|---|---|---|---|
| settings / mobile nav | Etiqueta "Settings" (desktop) vs "Ajustes" (móvil) para el mismo destino | P2 | Unificar a "Ajustes" | ✅ |
| settings "Pronto" | `SecurityNotice` (candado) usado para mensaje de roadmap → confunde seguridad con futuro | P2 | Texto muted/Badge "Pronto"; candado solo para privacidad | ✅ |
| settings "Eliminar cuenta" | Pintado `textMuted` → parece deshabilitado siendo enlace real | P3 | Color de enlace activo | ⏳ |
| /login/2fa, /eliminar-cuenta | Placeholders honestos correctos | — | Sin acción | — |
| error.tsx | Sin atajo a /app/mes (404 sí lo tiene) | P3 | — | ⏳ |
| logout / mobile nav | Visibles y completos (verificación positiva) | — | — | — |

## Metadata / branding
| Pantalla | Problema | Sev | Acción | R8 |
|---|---|---|---|---|
| Global | `layout` declara `/favicon.ico` pero **no existe** → 404 en toda la app | **P1** | Añadir `src/app/icon.svg` (marca wedge) | ✅ |
| Social (/, /precios, /luk, /soporte) | `/opengraph-image` referenciado pero **no existe** → tarjeta social sin imagen (crítico para TikTok) | **P1** | Crear `src/app/opengraph-image.tsx` (ImageResponse 1200×630) | ✅ |
| Global | Falta `metadataBase` → URLs OG/canonical relativas resuelven a localhost en build | **P1** | `metadataBase` en `layout.tsx` | ✅ |
| Global | Sin `openGraph`/`twitter` base en la raíz | P2 | Bloque base en `layout.tsx` | ✅ |
| robots vs sitemap | `/login` y `/signup` en sitemap pero bloqueados en robots (contradicción) | P2 | Quitarlos del sitemap | ✅ |

## Resumen
- **2 P0** (auth honesty signup) · **~9 P1** · **~12 P2** · resto P3.
- **R8 implementa:** los 2 P0, todos los P1, y los P2 de bajo riesgo (priorizando claridad snapshot/preview,
  feedback de guardado, detectado vs cobrado, historial/demo honesto, metadata/favicon).
- **Diferido (⏳):** P3 y P2 de mayor superficie o que requieren decisión de voz de producto (rebrand
  "copiloto", evidencia derivada, micro-notas opcionales). Listados arriba con su nota.
