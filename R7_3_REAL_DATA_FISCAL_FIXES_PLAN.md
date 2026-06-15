# R7.3 — Real-Data Fiscal Fixes Plan (Wedge v1)

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy `https://wedge-4r7s.vercel.app`.
> Corrige los P1 fiscales/parser de R7.2 que pueden sesgar resultados con XML reales, **sin** SAT,
> MCP, e.firma, CIEC, scraping, servicios pagos ni features grandes. Ver `R7_2_REAL_DATA_DOGFOODING_REPORT.md`.

## 1. Hallazgos que vienen de R7.2

- **F1 (P1):** retenciones solo a nivel documento se leían en 0 (CFDIs de plataformas: Uber/MercadoLibre).
- **F2 (P1):** XML ISO-8859-1/Windows-1252 → mojibake en nombres.
- **F3 (P1):** todo gasto recibido se asumía deducible (sin gate de UsoCFDI).
- **F4 (P1):** PUE se asumía cobrado en su mes sin etiquetarlo como supuesto.
- **F5 (P1):** `summarizeCfdiTaxes` podía mezclar USD (hoy ruta muerta de UI).
- **F6 (P2):** `issuerName` caía como fallback en `Transaction.description` (fuga latente).
- **F7/F8 (P2):** sin señal a nivel-mes para moneda extranjera; umbral $2,000 sobre subtotal, no total.

## 2. Qué se corrige ahora (R7.3)

| ID | Fix | Archivo |
|---|---|---|
| F1 | Path DOM lee impuestos **por tipo** (Traslado/Retención) con fallback a documento por-tipo | `cfdi-parser.ts` |
| F2 | `decodeXmlBytes`: respeta el encoding declarado (ISO-8859-1/Windows-1252) vía `TextDecoder` | `cfdi/upload.ts` |
| F3 | `es_deducible` gateado por `UsoCFDI` (`isLikelyDeductibleUso`); si no es claro → no se asume | `cfdi/taxes.ts` (+ `upload.ts`/`recompute.ts` propagan `cfdiUse`) |
| F4 | Copy honesto: el pendiente "Confirmar ingresos" etiqueta el supuesto PUE-cobrado | `cfdi/pending-actions.ts` |
| F5 | `summarizeCfdiTaxes` excluye moneda != MXN (+ documentado como no-usado en UI) | `cfdi/taxes.ts` |
| F6 | Descripción genérica ("CFDI emitido/recibido") en vez del nombre fiscal del emisor | `cfdi/taxes.ts` |

## 3. Qué se deja para después

- **F7** señal a nivel-mes cuando se excluyen CFDIs en moneda extranjera (P2, no bloquea).
- **F8** umbral $2,000 (Art. 27-III) sobre total pagado en vez de subtotal (P2, edge angosto).
- Conciliación real **REP↔PPD**, conversión por **TipoCambio**, estatus/cancelación **SAT real**,
  nómina per-item, unificación DOM/regex del parser. Todo requiere SAT real o refactor mayor → fuera de R7.3.

## 4. Riesgos fiscales

- **Dirección del cambio es conservadora:** gatear deducibilidad (F3) **quita** deducciones no claras →
  el ISR/IVA estimado **sube** (no baja) → no se infla. Leer retenciones doc-level (F1) reconoce dinero
  ya retenido (correcto). **No duplica** (test: retención por-concepto + documento cuenta una vez).
- **PUE sigue contándose** (no se bloquea el cálculo) pero etiquetado como supuesto (F4) — reduce
  sobreconfianza sin romper el flujo.
- Todo permanece **estimado informativo**; nada se vuelve certeza.

## 5. Riesgos de privacidad

- F3 propaga `cfdiUse` (código de catálogo c_UsoCFDI, p.ej. "G03") por `RedactedCfdi` → **NO es PII**
  (no es RFC/UUID/nombre); no llega al snapshot (que solo guarda agregados redactados).
- F6 **reduce** PII (deja de acarrear el nombre fiscal del emisor).
- F2 decodifica en memoria; **no persiste** XML ni cambia la redacción. Sin XML crudo guardado.

## 6. Criterio de salida

- typecheck + tests (incluidos los nuevos sintéticos) + build + lint verdes (≤ baseline).
- El cálculo **no se vuelve más optimista** sin justificación (F3 lo hace más conservador).
- Privacidad intacta (sin RFC/UUID/XML persistidos; snapshot redactado; `cfdiUse` no es PII).
- Copy seguro (sin "validado por SAT"/"declaración lista"/"deducible confirmado"/etc.).
- Fixtures **sintéticos** (cero datos reales) en los tests.
