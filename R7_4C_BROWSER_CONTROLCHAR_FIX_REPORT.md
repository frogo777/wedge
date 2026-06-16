# R7.4C — Causa raíz real del CFDI que se caía en el navegador (control char) + fix

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy `https://wedge-4r7s.vercel.app`.
> El founder re-subió `wedge-cfdi-synthetic-pack.zip` tras R7.4B y **seguía viendo 11 CFDIs / $50,000**
> (faltaba el caso ISO de $8,000). Este informe documenta la causa **real** (R7.4B la había
> diagnosticado mal), el fix y la verificación en navegador real.
> Sin SAT/MCP/e.firma/CIEC/servicios pagos; sin datos reales; sin convertir estimados en certezas.

## 1. Qué creíamos vs qué era (corrección de R7.4B)

| | R7.4B (incorrecto) | **R7.4C (real, verificado en navegador)** |
|---|---|---|
| Causa del drop del ISO | La declaración `encoding="ISO-8859-1"` en el prólogo hacía que el DOMParser rechazara el XML | Un **byte de control `0x14`** dentro del XML hace que el DOMParser **rechace el documento completo** (`xmlParseComment: invalid xmlChar value 20`) |
| De dónde salía el 0x14 | — | El generador escribía el comentario con un **em-dash "—" (U+2014)** y lo guardaba como latin1 (`Buffer.from(xml,"latin1")`) → `0x2014 & 0xFF = 0x14` (control char ilegal en XML 1.0) |
| ¿El fix de R7.4B servía? | Se creía que sí | **No** — normalizar el prólogo a UTF-8 era un **no-op** para este bug (el DOMParser ignora la declaración en `parseFromString`). Por eso el founder seguía en 11. |

**Verificación en navegador real** (Chromium vía preview, DOMParser nativo):
- XML con `encoding="ISO-8859-1"` + acentos, **sin** control char → **parsea OK** (la declaración NO era el problema).
- XML con un `0x14` → **`RECHAZADO: xmlParseComment: invalid xmlChar value 20`** (el documento entero se cae).
- El mismo XML tras **quitar los control chars C0** → **`PARSEA subtotal=8000.00`**. ✅

Por qué Node daba 12 y el navegador 11: el parser de Node es **regex** (ignora control chars); el del
navegador es **DOMParser** (rechaza el documento ante un solo char ilegal). La única divergencia
node↔browser estaba aquí, no en el prólogo.

## 2. El fix (dos partes)

1. **`src/lib/cfdi/upload.ts` → `decodeXmlBytes` (hardening de producto, la que destraba al founder):**
   tras decodificar, **descarta los caracteres de control ILEGALES en XML 1.0** (todo el rango C0 salvo
   `tab`/`LF`/`CR`) con un loop por code-point (sin regex de control chars). Esto reconcilia el parseo
   **browser↔Node**: un CFDI con control chars de un ERP/PAC real (o un carácter mal codificado) ya **no
   se cae solo en el navegador**. No toca montos/RFC (ASCII); solo limpia ruido que no es XML válido.
   *Efecto colateral bueno:* con esto, **hasta el ZIP viejo** (con el `0x14`) ya rinde 12 CFDIs.
2. **`scripts/generate-synthetic-cfdi-pack.mjs` (limpia el fixture):** el em-dash `"—"` del comentario →
   guion ASCII `"-"`, y un guard `toLatin1Safe()` que mapea cualquier codepoint `> 0xFF` a `"-"` antes de
   escribir en latin1 (evita reintroducir un `0x14` en el futuro). Fixtures regenerados: el archivo 12 ya
   **no tiene control chars** (`illegalC0=NONE`) y conserva los acentos latin1 (`é`, `ñ`, …).

## 3. Tests
- **Nuevo `src/lib/cfdi/decode-xml.vitest.ts` (3 tests):** `decodeXmlBytes` quita `0x14`/`0x0B`/`0x0C`,
  conserva `tab/LF/CR`, mantiene acentos (sin mojibake), normaliza el prólogo a UTF-8 y el resultado parsea.
- `synthetic-pack.vitest.ts` y `synthetic-reconciliation.vitest.ts` siguen verdes con el fixture regenerado
  (**12 CFDIs**, $58,000, retenciones $3,575).

## 4. QA
- typecheck **PASS** · tests **406 passed** (era 403; +3) · build **PASS** (27 rutas) · lint **10e/5w**
  (baseline exacto; sin deuda nueva; 0 en código de app).

## 5. Números finales esperados (no cambian respecto a R7.4B; ahora SÍ se alcanzan en el navegador)
- **12 CFDIs** leídos. **Fiscal Inbox:** 8 ingresos · 2 gastos · 6 requieren revisión · 1 PPD · 0
  cancelados · **ingresos detectados $58,000** · **retenciones $3,575** (ISR $375 + IVA $3,200).
  **Mes Fiscal:** "Confirmar **6** ingresos cobrados **$58,000**" (USD excluido; ISO de $8,000 ya cuenta).

## 6. Verificación que falta (founder, navegador)
Re-subir el ZIP en el deploy con R7.4C y confirmar **12 CFDIs / $58,000**. Con el strip de control chars,
**funciona con el ZIP regenerado y también con el que ya tenías descargado**. Para evitar caché de la
vista previa anterior, usar una **ventana de incógnito** o **"Borrar vista previa"** antes de re-procesar.

## 7. Sin cambios de alcance
Sin SAT, sin MCP nuevo, sin e.firma/CIEC, sin features nuevas, sin tocar dominios ni `wedge-4r7s`.
Pendientes manuales del founder siguen abiertos: rotar Supabase secret + revocar token Vercel; borrar
el Vercel duplicado `wedge` (NO `wedge-4r7s`).
