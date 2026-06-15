# Paquete de CFDIs sintéticos — Wedge (R7.4A)

> ⚠️ **DATOS SINTÉTICOS / FALSOS.** Estos XML **no son CFDIs válidos para el SAT** (timbre falso, RFCs de
> prueba). Sirven solo para validar el **parser, la UX y el flujo** de Wedge **sin usar datos fiscales
> reales**. No contienen información de personas, clientes ni empresas reales. No subir a ningún servicio
> externo; Wedge los procesa en el navegador y no los guarda.

## Cómo se generan / regeneran

```
npm run fixtures:cfdi
```

Genera (determinista): `xml/*.xml` (13 archivos) + `zip/wedge-cfdi-synthetic-pack.zip` (junio, 12 XML) +
`zip/wedge-cfdi-multimonth.zip` (mayo+junio). Fuente: `scripts/generate-synthetic-cfdi-pack.mjs`.

## Cómo usarlos en la app

1. Entra a `https://wedge-4r7s.vercel.app/login` (login con contraseña).
2. Ve a **Mes Fiscal**. *(Si ves "Tu Mes Fiscal empezó con tu diagnóstico", haz clic en **"Borrar diagnóstico
   local"** para que aparezca el cargador — ver `R7_4A_SYNTHETIC_CFDI_MANUAL_TEST.md`.)*
3. En **"Completar con XML/ZIP"**: marca el consentimiento → **Seleccionar XML/ZIP** → elige
   `zip/wedge-cfdi-synthetic-pack.zip` → **Procesar**.

## Casos incluidos y resultado esperado

| Archivo | Caso | Esperado en Wedge |
|---|---|---|
| `01-ingreso-pue-mxn.xml` | Ingreso PUE MXN sin retención | Ingreso emitido; cuenta como cobrado; IVA trasladado $1,600 |
| `02-ingreso-ret-isr.xml` | Ingreso + retención ISR (concepto) | Retención ISR $125 detectada |
| `03-ingreso-ret-iva.xml` | Ingreso + retención IVA (concepto) | Retención IVA ≈ $1,066.67 detectada |
| `04-ingreso-plataforma-ret-concepto.xml` | Plataforma, retención ISR+IVA por concepto | Ambas retenciones detectadas |
| `05-ingreso-plataforma-ret-documento.xml` | Plataforma, retención **solo a nivel documento** (F1) | Retención **NO sale en $0** (se lee del bloque de documento) |
| `06-ingreso-ppd.xml` | Ingreso PPD sin REP | "Pendiente de complemento"; **no** cuenta como cobrado |
| `07-rep-complemento.xml` | REP (complemento de pago) del #06 | Excluido; **no** es ingreso nuevo |
| `08-gasto-g03-deducible.xml` | Gasto recibido UsoCFDI **G03** | Gasto deducible **probable** (acredita IVA) |
| `09-gasto-s01-no-claro.xml` | Gasto recibido UsoCFDI **S01** | **No** asumido deducible → "por revisar" |
| `10-egreso-nota-credito.xml` | Egreso / nota de crédito (tipo E) | No entra al cálculo automático; por revisar |
| `11-ingreso-usd.xml` | Ingreso en **USD** | Excluido del auto-cálculo + aviso de moneda |
| `12-ingreso-iso8859.xml` | Encoding **ISO-8859-1** con acentos | Nombre con acentos correcto (sin mojibake) |
| `13-ingreso-mayo.xml` | Ingreso de **mayo** | Para el ZIP multi-mes (aviso "varios meses") |

**ZIPs:**
- `wedge-cfdi-synthetic-pack.zip` — 01–12 (todo junio): el set completo de un mes.
- `wedge-cfdi-multimonth.zip` — mayo + junio: dispara el aviso de **varios meses** (la vista previa es de un
  solo mes; los de otros meses se reportan, no se descartan en silencio).

**Agregado esperado (junio, pack completo):** ingresos cobrados **$58,000** (01–05 + 12), retención ISR
total **$375** (02+04+05, incluye la de nivel documento), gastos por revisar (08 deducible / 09 no),
PPD/USD/REP/egreso fuera del cálculo. Todo etiquetado **"estimado informativo"**.

## Limitaciones (no se puede simular solo con XML)

- **Cancelación SAT:** el estatus de cancelación es metadata externa (no viaja en el XML), así que un CFDI
  "cancelado" no se detecta como tal solo por el archivo. Requiere datos/estatus reales del SAT.
- **Validez de timbre:** el UUID/sello son falsos; Wedge no valida contra el SAT en esta fase.
- **TipoCambio real / conciliación REP↔PPD real:** requieren datos reales.
