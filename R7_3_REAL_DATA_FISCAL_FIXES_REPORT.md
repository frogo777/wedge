# R7.3 — Real-Data Fiscal Fixes Report (Wedge v1)

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy `https://wedge-4r7s.vercel.app`.
> Cierra los P1 fiscales/parser de R7.2 sin SAT/MCP/e.firma/CIEC/servicios pagos. Acompaña a
> `R7_3_REAL_DATA_FISCAL_FIXES_PLAN.md`.

## 1. Qué se corrigió

| ID | Hallazgo R7.2 | Fix aplicado | Archivo:¿qué cambió? |
|---|---|---|---|
| **F1** | Retenciones a nivel documento se leían en 0 (CFDIs de plataformas) | El path **DOM** ahora elige impuestos **por tipo**: prefiere per-concepto y cae al bloque de documento **solo para el tipo ausente** (antes era todo-o-nada). El path regex ya era correcto. | `cfdi-parser.ts` `extractImpuestosFromDom` |
| **F2** | XML ISO-8859-1/Windows-1252 → mojibake | `decodeXmlBytes`: lee bytes, detecta el `encoding` declarado en el prólogo (+BOM) y decodifica con `TextDecoder` nativo. `readXmlFile` y las entradas ZIP lo usan (antes `file.text()`/`strFromU8` = UTF-8 forzado). Sin dependencias. | `cfdi/upload.ts` |
| **F3** | Todo gasto recibido se asumía deducible | `es_deducible` se gatea por **UsoCFDI** (`isLikelyDeductibleUso`: G01/G02/G03, I01–I08, D01–D10 → probable; S01/CP01/CN01/vacío/desconocido → **no se asume**). `cfdiUse` se propaga por `RedactedCfdi`→recompute para consistencia tras recargar. | `cfdi/taxes.ts`, `cfdi/upload.ts`, `cfdi/recompute.ts` |
| **F4** | PUE se asumía cobrado sin avisar | El pendiente "Confirmar ingresos" ahora dice: "Asumimos que los PUE ya se cobraron —es un supuesto—; confírmalos…". No bloquea el cálculo; reduce sobreconfianza. | `cfdi/pending-actions.ts` |
| **F5** | `summarizeCfdiTaxes` mezclaba USD | Excluye moneda != MXN (consistente con `cfdiToTransaction`) + documentado como **no usado en UI** (los números del usuario salen del motor canónico). | `cfdi/taxes.ts` |
| **F6** | `issuerName` caía en `Transaction.description` | Fallback genérico ("CFDI emitido/recibido/Movimiento fiscal") en vez del nombre fiscal del emisor. | `cfdi/taxes.ts` |

## 2. Tests agregados

Nuevo `src/lib/cfdi/r7_3-fiscal-fixes.vitest.ts` — **11 tests, fixtures sintéticos (cero datos reales)**:
- **F1:** CFDI de plataforma (Traslado por concepto + Retenciones solo a nivel documento) → ISR retenido
  1062.50 e IVA retenido 130 se leen (no 0); IVA trasladado 1600 (no duplicado); la retención llega al Mes
  Fiscal; **no se duplica** una retención presente por-concepto **y** a nivel documento (cuenta 125, no 250).
- **F2:** UTF-8 con acentos OK; **ISO-8859-1 con acentos NO produce mojibake** (sin `�`); un CFDI completo en
  ISO-8859-1 sigue parseando.
- **F3:** `isLikelyDeductibleUso` (G01/G03/I04/D01 → sí; S01/CP01/CN01/vacío/desconocido → no); gasto G03 →
  `es_deducible true`; gasto S01 → `es_deducible false`.
- **F5:** un ingreso USD no infla el resumen MXN.
- **F6:** sin descripción de concepto → "CFDI emitido", **no** el nombre del emisor.

**QA:** typecheck PASS · **379 tests** (32→33 files; 368→379, +11) · build PASS (27 rutas) · lint **10e/5w**
(= baseline, 0 deuda nueva) · barrido copy-safety = 0 claims prohibidos.

## 3. Qué cambió en el cálculo

- **Más conservador, nunca más optimista:** F3 deja de acreditar IVA / restar base por gastos con UsoCFDI no
  claro → el ISR/IVA estimado **sube** (no se infla). F1 reconoce retenciones que antes (ruta DOM/navegador)
  podían quedar en 0 → refleja dinero ya retenido a favor del usuario.
- **PUE:** sigue contándose para el estimado, ahora **etiquetado como supuesto** (el usuario confirma).
- **USD:** excluido del resumen rápido (ya estaba excluido del motor canónico).
- Sin cambios en brackets RESICO 113-E, tabla Art. 96 acumulada, exclusión cancelados/REP, ni PPD cash-basis.

## 4. Qué se mantiene como estimado

Todo. Los números siguen rotulados **"estimado informativo / por revisar"** y "Wedge prepara; tú validas en
SAT". La deducibilidad por UsoCFDI es **probable**, no definitiva (el usuario revisa). El cobro de PUE es un
**supuesto**. Nada se presenta como validado/declarado/confirmado por el SAT.

## 5. Qué falta para datos SAT reales

- Conciliación real **REP↔PPD** (reconocer el ingreso PPD en el mes de la fechaPago del complemento).
- Conversión por **TipoCambio** para CFDIs en moneda extranjera (hoy se excluyen del cálculo).
- **Estatus y cancelación reales del SAT** (hoy la cancelación es metadata; el XML no porta el estatus).
- UsoCFDI es heurística de deducibilidad, no sustituye la **indispensabilidad** real (Art. 27-I) que el
  usuario/su contador valida.
- Todo lo anterior requiere SAT real (descarga masiva / e.firma / CIEC) → **fuera de scope** hasta tener
  presupuesto/decisión (no en R7.3).

## 6. Riesgos restantes

- **F1 en la ruta DOM** (navegador) está verificado por **equivalencia de lógica** con la ruta regex (que sí
  se prueba en node — vitest corre en `node`, sin DOMParser). Ambas rutas ahora usan la misma lógica per-tipo;
  el test de contrato fija el comportamiento esperado.
- F2 cubre los encodings comunes (UTF-8/ISO-8859-1/Windows-1252) por el prólogo declarado; un XML sin
  declaración y no-UTF-8 se asume UTF-8 (caso raro).
- **P2 diferidos:** F7 (señal de moneda extranjera a nivel mes), F8 (umbral $2,000 sobre total), nómina
  per-item, divergencia DOM/regex del parser. No bloquean el dogfooding.

## 7. Qué NO se implementó (fuera de scope / reglas)

- ❌ SAT real, MCP, e.firma, CIEC, scraping, descarga masiva, servicios pagos, SMTP, Google OAuth, dominios,
  `wedgemx.com`.
- ❌ No se convirtió ningún estimado en certeza; no se persiste XML crudo; no se imprimen RFC/UUID/XML.
- ❌ No se rompió el pipeline (379 tests verdes, incluidos los 368 previos).

**Pendientes manuales del founder (siguen):** rotar Supabase secret + revocar token Vercel; borrar el Vercel
duplicado `wedge`; y la corrida hands-on con CFDIs reales (validar F1–F4 en vivo, sobre todo un CFDI real de
plataforma para confirmar que la retención ya no sale en 0).
