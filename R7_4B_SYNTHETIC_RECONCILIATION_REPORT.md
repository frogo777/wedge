# R7.4B — Synthetic Pack Reconciliation Report

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy `https://wedge-4r7s.vercel.app`.
> El founder probó `wedge-cfdi-synthetic-pack.zip` en vivo y reportó números. Aquí se reconcilian
> pack ↔ tests ↔ manual ↔ Fiscal Inbox ↔ Mes Fiscal para que **todas las superficies digan lo mismo**.
> Sin SAT/MCP/e.firma/CIEC/servicios pagos; sin datos reales; sin convertir estimados en certezas.

## 1. Qué vio el founder (browser)
Inbox: **11 CFDIs**, 7 ingresos, 2 gastos, 6 requieren revisión, **ingresos $50,000**, **retenciones $3,575**,
0 cancelados, 1 PPD, luk 7 señales (principal: PPD). Mes Fiscal: 11 CFDIs leídos, "Confirmar **6 ingresos**
cobrados (**$51,000** aprox.)", 18% listo.

## 2. Qué encontró el pipeline local (Node, test de reconciliación)
Sobre el MISMO ZIP: **12 CFDIs**, 8 ingresos, 2 gastos, 6 requieren revisión, **ingresos $58,000**,
retenciones **$3,575**, 0 cancelados, 1 PPD, luk ≥1. "Confirmar **6** ingresos cobrables MXN por **$58,000**".

## 3. Tabla de reconciliación
| Métrica | Manual (antes) | Founder (browser) | Local (Node) | Veredicto |
|---|---|---|---|---|
| Entradas en ZIP | ~12 | — | **12** | ZIP OK |
| CFDIs parseados | 12 | **11** | **12** | 🔴 **BUG browser**: el caso ISO se caía |
| CFDIs periodo junio | 12 | 11 | 12 | idem |
| Ingresos detectados ($) | $58,000 | **$50,000** | **$58,000** | 🔴 consecuencia del ISO caído (−$8,000) |
| Ingresos cobrados (Mes) | — | 6 / **$51,000** | 6 / **$58,000** | 🟠 **BUG UX**: el USD inflaba +$1,000 |
| Gastos | 2 | 2 | 2 | ✅ |
| Retenciones | "ISR ≈ $375" | **$3,575** | **$3,575** | 🟠 **manual confuso** (solo citó ISR); app correcta (ISR 375 + IVA 3,200) |
| Cancelados | 0 | 0 | 0 | ✅ (el pack no incluye cancelado) |
| PPD sin REP | 1 | 1 | 1 | ✅ |
| no-MXN excluido | sí | sí | sí | ✅ |
| luk signals | ≥1 | 7 | ≥1 | ✅ |

## 4. Qué estaba mal (y dónde)
1. **Parser (solo navegador):** el CFDI en **ISO-8859-1** se caía en el DOMParser del navegador (parseaba en
   Node/regex pero no en el browser) porque el string ya decodificado a Unicode conservaba la declaración
   `encoding="ISO-8859-1"` en el prólogo → el navegador lo rechazaba. Efecto: −1 CFDI y −$8,000 (11/$50k en
   vez de 12/$58k).
2. **UX/cálculo:** el pendiente "Confirmar ingresos" sumaba el CFDI en **USD a valor nominal** ($1,000) →
   Mes mostraba **$51,000** mientras el Inbox (motor canónico, excluye no-MXN) mostraba **$50,000**.
3. **Manual:** decía "ISR ≈ $375" (solo la parte de ISR) → confusión frente al total **$3,575** (ISR + IVA).
   Y daba "~12 / $58,000" como aproximado en vez de exacto.

**No** había bug en: cancelados (el pack no trae uno — limitación documentada), PPD, REP, no-MXN, retenciones
(el $3,575 era correcto), ni en el ZIP (12 entradas correctas).

## 5. Qué se corrigió
- **`cfdi/upload.ts` → `decodeXmlBytes`:** tras decodificar, **normaliza el prólogo a `encoding="UTF-8"`** (el
  string ya es Unicode) → el caso ISO ya no se cae en el navegador.
- **`cfdi/pending-actions.ts`:** "Confirmar ingresos" cuenta **solo cobrables en MXN** (no infla con USD) y el
  copy aclara que el PPD se cuenta aparte. → Mes ($58,000) e Inbox ($58,000) ahora coinciden.
- **`R7_4A_SYNTHETIC_CFDI_MANUAL_TEST.md`:** números **exactos** + retenciones **$3,575 (ISR $375 + IVA
  $3,200)** + explicación de **8 ingresos (Inbox) vs 6 cobrables (Mes)**.
- **Tests:** nuevo `synthetic-reconciliation.vitest.ts` (6 tests) que fija la verdad final del ZIP.

## 6. Números finales esperados (post-R7.4B, verdad fijada por test)
- **12 CFDIs** leídos. **Fiscal Inbox:** 8 ingresos · 2 gastos · 6 requieren revisión · 1 PPD · 0 cancelados ·
  **ingresos detectados $58,000** · **retenciones $3,575**. **Mes Fiscal:** "Confirmar **6** ingresos cobrados
  **$58,000**". **luk ≥1** (principal PPD). USD excluido del monto; ISO ($8,000) ahora sí cuenta.
- QA: typecheck PASS · **403 tests** · build PASS (27 rutas) · lint 10e/5w (sin deuda nueva).

## 7. Qué queda pendiente
- **Verificación browser-only:** el fix del ISO no se puede ejercitar en Node (sin DOMParser); el founder debe
  **re-subir el ZIP** en el deploy con R7.4B y confirmar **12 CFDIs / $58,000 / retenciones $3,575** (ya no 11/$50k).
- El pack **no incluye un cancelado real** (el estatus no viaja en el XML) ni conciliación **REP↔PPD** (requiere
  datos reales del SAT).
- Pendientes manuales del founder: rotar Supabase secret + revocar token Vercel; borrar Vercel duplicado `wedge`.

## 8. ¿El founder debe repetir la prueba?
**Sí.** Una vez desplegado R7.4B: re-subir `wedge-cfdi-synthetic-pack.zip` y confirmar (anonimizado):
- ¿Ahora detecta **12** CFDIs (antes 11)?
- ¿**Ingresos detectados $58,000** (antes $50,000)?
- ¿Mes dice "Confirmar 6 ingresos **$58,000**" (antes $51,000)?
- ¿Retenciones **$3,575**? ¿USD sigue excluido? ¿PPD pendiente?

Si los 4 cuadran, pack/tests/manual/Inbox/Mes quedan **reconciliados** y el dogfooding sintético es confiable.
