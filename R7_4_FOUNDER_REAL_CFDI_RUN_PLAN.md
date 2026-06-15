# R7.4 — Founder Real-CFDI Run Plan (worksheet)

> **Fecha:** 2026-06-15 · Deploy `https://wedge-4r7s.vercel.app` (commit `f61beee`, R7.3) · Repo `frogo777/wedge`.
> **Esta corrida la haces TÚ (founder)** con tus CFDIs reales en la app. El agente **no** ve ni pide
> XML/RFC/UUID; solo recibe tus observaciones **anonimizadas**. Lo que no pruebes = **"no probado"** (no se
> inventa). Sin SAT/MCP/e.firma/CIEC/scraping/servicios pagos.

## Privacidad (lee antes de empezar)

- **No compartas** RFC completo, UUID completo, XML, nombres fiscales completos, ni capturas con datos
  sensibles. Si describes algo, usa "Emisor 1", "RFC `XXX******`", montos en rangos ("≈ $50k").
- Tus XML se procesan **en tu navegador**; no se suben. El snapshot guarda solo un **resumen redactado**.
- Si ves tu RFC/UUID **completo** en pantalla en cualquier momento → es un hallazgo **P0**, anótalo.

## Pre-requisito

Crea un usuario auto-confirmado en Supabase (Authentication → Users → Add user → **Auto Confirm User**) si aún
no tienes con qué entrar.

---

## TAREA 1 — Checklist de prueba (síguelo en orden)

1. **Login** en `/login` con **correo + contraseña** (es el método por defecto).
2. Caes en **`/app/mes`**.
3. En "Completar con XML/ZIP", **marca el consentimiento** y **carga tu XML/ZIP real** (controlado).
4. **Confirma que no truena** (no pantalla en blanco, no error rojo inesperado).
5. ¿Detecta CFDIs **emitidos** (tus ingresos) y **recibidos** (tus gastos)?
6. ¿Aparecen **retenciones** (si tus CFDIs las traen)?
7. ¿Hay **gastos marcados "por revisar"** (no asumidos deducibles)?
8. Ve a **`/app/cfdis`** (Fiscal Inbox).
9. **Confirma / excluye / marca revisión** algunos CFDIs.
10. Vuelve al **Mes Fiscal**.
11. ¿El **Mes Fiscal cambia** según tus decisiones (excluir baja el estimado)?
12. Abre **luk** (`/app/luk`): ¿explica algo útil?
13. **Guarda snapshot** (con consentimiento).
14. **Recarga** la página.
15. ¿**Persiste** como "Guardado en tu cuenta"?
16. **Logout** (Settings → Sesión, o "Salir" en móvil) y **login** de nuevo.
17. ¿**Sigue** tu avance?

---

## TAREA 2 — Casos a buscar (si los tienes; si no, "no probado")

| Caso | ¿Lo tienes? |
|---|---|
| CFDI de ingreso normal **PUE** | ☐ |
| CFDI con **retención ISR** | ☐ |
| CFDI con **retención IVA** | ☐ |
| CFDI de **plataforma/intermediario** (Uber/MercadoLibre/Amazon/Didi/Rappi) | ☐ |
| CFDI **recibido** con UsoCFDI **G03 / I0x / D0x** (gasto deducible) | ☐ |
| CFDI **recibido** con **S01 / CP01** o uso no claro | ☐ |
| CFDI **PPD** | ☐ |
| **Complemento de pago (REP)** | ☐ |
| CFDI **cancelado** | ☐ |
| CFDI en **moneda != MXN** (USD/EUR) | ☐ |

> No inventes: si no tienes uno, déjalo en "no probado".

---

## TAREA 3 — Matriz de observación (yo lleno "Observado" con lo que me reportes)

"Esperado" según los fixes de R7.3. **"Observado" queda PENDIENTE hasta tu corrida.**

| Caso | Probado | Resultado esperado | Observado | Problema | Sev | Fix |
|---|---|---|---|---|---|---|
| Carga XML/ZIP | ⏳ | Carga sin tronar; preview del mes | pendiente | | | |
| Ingreso PUE | ⏳ | Detectado como ingreso; cuenta como cobrado (supuesto, etiquetado) | pendiente | | | |
| Retención ISR | ⏳ | Se lee del XML; aparece en "Validar retenciones"; **no 0** | pendiente | | | |
| Retención IVA | ⏳ | Idem ISR; **no 0** | pendiente | | | |
| **CFDI plataforma** (Traslado x concepto + Retención a nivel documento) | ⏳ | **Retención NO sale en 0** (fix F1) | pendiente | | | |
| Gasto recibido **G03/I0x/D0x** | ⏳ | Gasto deducible **probable** (acredita IVA) | pendiente | | | |
| Gasto recibido **S01/CP01/uso no claro** | ⏳ | **No asumido deducible** → "por revisar" | pendiente | | | |
| **PPD** | ⏳ | **No** cuenta como cobrado; "pendiente de complemento" | pendiente | | | |
| **REP** | ⏳ | Excluido como ingreso nuevo (no duplica) | pendiente | | | |
| **Cancelado** | ⏳ | Excluido del cálculo; riesgo "CFDI cancelado" | pendiente | | | |
| **Moneda != MXN** | ⏳ | Excluido del auto-cálculo; aviso de moneda (sin señal a nivel-mes aún = P2 conocido) | pendiente | | | |
| Decidir en Inbox | ⏳ | Excluir baja el estimado; refleja en Mes Fiscal | pendiente | | | |
| luk | ⏳ | Señal/explicación útil y honesta | pendiente | | | |
| Snapshot guardar/recargar | ⏳ | Persiste resumen redactado; nada sensible | pendiente | | | |
| Privacidad en pantalla | ⏳ | **Sin RFC/UUID/XML crudos** visibles | pendiente | | | |

**Severidad:** P0 = fuga de datos / crash / cálculo obviamente falso / no se puede borrar-salir · P1 = número
posiblemente sesgado / copy confuso / UX bloqueante · P2 = visual / microcopy / orden.

---

## TAREA 4 — Preguntas seguras (respóndeme estas, anonimizadas)

1. ¿El XML/ZIP **cargó o falló**?
2. ¿Cuántos CFDIs detectó **aproximadamente**?
3. ¿Detectó **ingresos**?
4. ¿Detectó **gastos**?
5. ¿Detectó **retenciones**?
6. ¿Alguna **retención salió en 0** cuando tú sabes que existe?
7. ¿Algún **gasto se contó como deducible** cuando debería estar en revisión?
8. ¿Algún **CFDI PPD se contó como cobrado**?
9. ¿**luk** explicó algo útil?
10. ¿Qué parte te **confundió**?
11. ¿**Guardar snapshot** funcionó?
12. ¿Después de **recargar** seguía?
13. ¿Viste algún **RFC/UUID completo** en pantalla?
14. ¿Hubo alguna **pantalla rota**?

*(No me mandes RFC/UUID/XML/capturas con datos sensibles/nombres fiscales completos.)*

---

## TAREA 5 — Fix policy

No se arregla todo de golpe. **Fix inmediato solo si es P0:** fuga de privacidad, crash, cálculo falso
evidente, o bloqueo de uso. **P1/P2 se documentan** para una fase siguiente.

---

## Siguiente paso

Corre el checklist y mándame las respuestas a las 14 preguntas (anonimizadas). Con eso lleno la matriz y
escribo `R7_4_FOUNDER_REAL_CFDI_RUN_REPORT.md` (clasificando P0/P1/P2 y la recomendación). Si reportas un
**P0**, lo corrijo de inmediato; si no, documento P1/P2 para después.
