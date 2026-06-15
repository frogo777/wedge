# R7.4A — Synthetic CFDI Validation Report

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` · Deploy `https://wedge-4r7s.vercel.app` (commit `f61beee`).
> Acompaña a `R7_4A_SYNTHETIC_CFDI_VALIDATION_PLAN.md` y `R7_4A_SYNTHETIC_CFDI_MANUAL_TEST.md`.
> Sin SAT/MCP/e.firma/CIEC/servicios pagos; sin datos reales; sin persistir XML crudo.

## 1. Resumen ejecutivo
El founder no tiene CFDIs reales a la mano. En vez de bloquearnos, creamos un **paquete de CFDIs sintéticos**
(13 XML + 2 ZIP, datos obviamente falsos) y **18 tests** que ejercitan el pipeline real (parser → clasificación
→ retenciones → PPD/REP → USD → UsoCFDI → encoding → Mes Fiscal → luk → privacidad). **Todo pasa.** Esto
**desbloquea el dogfooding del flujo completo sin datos reales.** Además se documentó un **P1 de estructura**
(el cargador de XML está oculto en modo diagnóstico) detectado en vivo con el founder.

## 2. En qué fase estamos
Dogfooding founder, sin costo, sin SAT. App viva y estable; pipeline fiscal correcto (R7.3). Faltaba ejercitar
el camino de XML — ahora cubierto con datos sintéticos.

## 3. Por qué NO estamos bloqueados sin CFDIs reales
El parser, la clasificación, el cálculo y la UX se validan con CFDIs **sintéticos** (estructura idéntica a un
CFDI 4.0). Lo único que requiere datos reales es el estatus/cancelación SAT, la conciliación REP↔PPD real, el
TipoCambio real y que los importes cuadren con la contabilidad del founder.

## 4. Qué paquete sintético se creó
- `scripts/generate-synthetic-cfdi-pack.mjs` (node + fflate, determinista) · `npm run fixtures:cfdi`.
- `fixtures/cfdi/synthetic/xml/` → **13 XML** sintéticos. `fixtures/cfdi/synthetic/zip/` → **2 ZIP**
  (`wedge-cfdi-synthetic-pack.zip` = junio/12 XML; `wedge-cfdi-multimonth.zip` = mayo+junio).
- `fixtures/cfdi/synthetic/README.md` (qué es, cada caso, esperado, limitaciones).
- Datos 100% sintéticos: RFCs `SYNU/CLIA/PLAT/PROV…`, UUIDs de ceros, marca "SINTÉTICO". **Verificado: el ZIP
  no contiene datos reales** (solo los 4 RFCs falsos).

## 5. Qué casos cubre
Ingreso PUE; +retención ISR (concepto); +retención IVA (concepto); plataforma con retención por concepto;
**plataforma con retención SOLO a nivel documento (F1)**; PPD sin REP; REP relacionado; gasto UsoCFDI G03
(deducible); gasto UsoCFDI S01 (no claro); egreso/nota de crédito; ingreso USD; encoding ISO-8859-1 con
acentos; ingreso de otro mes (para el aviso multi-mes vía ZIP). *(Cancelación SAT = limitación documentada:
no viaja en el XML.)*

## 6. Qué se pudo validar (tests, todos verdes)
- Parser CFDI 4.0 (namespaces, conceptos, impuestos, timbre, REP/pago20).
- Retenciones **a nivel concepto Y a nivel documento** (caso 05 → ISR no sale en $0; agregado ISR = $375
  incluye la de documento → guarda el fix **F1**). **No duplica** traslados.
- PPD → "pendiente de complemento", no cobrado. REP → excluido (no ingreso nuevo).
- Gasto **G03** → deducible probable; **S01** → no asumido (F3).
- **USD** → excluido del cálculo + aviso de moneda. **ISO-8859-1** → acentos correctos, sin mojibake (F2).
- Mes Fiscal agregado (junio): **ingresos cobrados $58,000**, retención ISR **$375**, ingresos>0 y
  retenciones>0; **luk** genera ≥1 señal.
- **Privacidad:** el `RedactedCfdi` NO expone UUID crudo, RFC completo ni nombres fiscales (F6 incl.).

## 7. Qué NO se puede validar hasta tener CFDIs reales
Estatus/cancelación reales del SAT; conciliación REP↔PPD real; TipoCambio real; inferencia del RFC real del
founder; que los importes coincidan con su contabilidad; indispensabilidad real de gastos (UsoCFDI es
heurística). Todo eso es la corrida con XML reales del founder (cuando los tenga) — no requiere servicios pagos.

## 8. Resultado de tests
`src/lib/cfdi/synthetic-pack.vitest.ts`: **18 tests, todos verdes** (parsing por caso, agregado, luk,
privacidad). Total del repo: **397 tests** (34 files; +18 vs R7.3).

## 9. Resultado QA
`typecheck` PASS · `test` **397 passed** · `build` PASS (27 rutas) · `lint` **10 errores / 5 warnings**
(= baseline; deuda heredada en archivos de test/lib; **0 deuda nueva**). Smoke: `/login` 200, `/app/*` 307→
`/login`, `/api/debug/version` = `f61beee`. ZIP generado, parseable y **sin datos reales**.

## 10. Structural Hardening Findings (TAREA 6)
**Ningún P0 nuevo.** Privacidad, login/logout, nav móvil, boundaries (error/404/loading), 404 custom, links
muertos, copy fiscal ("estimado") y empty states están **sólidos** (verificados en R7.1/R7.2 + el test del pack).

| ID | Sev | Hallazgo | Nota |
|---|---|---|---|
| H1 | **P1** | **Cargador de XML no descubrible:** en **modo diagnóstico** el uploader está oculto (badge "Pronto") y el CTA del hero "Completar con XML/ZIP" navega a `/app/cfdis` **vacío** (callejón). | Detectado **en vivo** (bloqueó al founder 2 veces). Workaround: "Borrar diagnóstico local". Borde P0 (bloquea la carga) pero hay salida → P1. **Top fix siguiente.** Parte regresión de R7.1 (CTA→/app/cfdis). |
| H2 | P2 | La página **CFDIs** vacía solo ofrece "Volver al Mes Fiscal"/"demo ficticia"; no un acceso directo a subir → leve rodeo. | |
| H3 | P2 | **Settings** sin editar perfil/contraseña/RFC/billing. | Conocido (R7). |
| H4 | P2 | **Demo** con copy posesivo + historial "presentado" falso. | Conocido (R7); etiquetado "Datos de ejemplo". |
| H5 | P2 | luk: severidad `blocker` (rojo) sin uso; favicon/OG faltantes; F7/F8 fiscales diferidos. | Conocido. |

Per la fix policy: **no se arregló ningún P1/P2** (solo P0, y no hubo). H1 queda recomendado para fix inmediato.

## 11. Qué falta para dogfooding más fuerte
1. **Arreglar H1** (descubribilidad del cargador): mostrar el uploader también en modo diagnóstico y que el
   CTA "Completar con XML/ZIP" abra la carga (no `/app/cfdis` vacío). Es lo que más fricciona hoy.
2. Que el founder **corra el pack sintético** (guía `R7_4A_SYNTHETIC_CFDI_MANUAL_TEST.md`) y reporte.
3. Corrida con **CFDIs reales** cuando los tenga.

## 12. Siguiente fase recomendada
**R7.5 — Upload discoverability fix** (chico, con QA, sin SAT/MCP/pagos): cerrar H1 para que subir XML sea
obvio desde cualquier modo. Después, la corrida real con CFDIs del founder.

---
**Conclusión:** el paquete sintético **pasa**; Wedge puede seguir dogfoodeándose **sin CFDIs reales**. La fase
con CFDIs reales del founder queda para cuando tenga XML disponibles. **Pendientes manuales del founder
(siguen):** rotar Supabase secret + revocar token Vercel; borrar Vercel duplicado `wedge`.
