# Data Flow Map — Wedge v1

> **Fecha:** 2026-06-16 · `ac8496b`. Mapa de los 7 flujos de datos, trazados sobre el código real (R9).
> Principio: el cómputo fiscal es **determinista y client-only** sobre CFDIs **redactados**; lo único que llega a
> DB es un **snapshot agregado redactado** (auth + CSRF + RLS + doble red anti-PII). El XML nunca sale del navegador.

## 1. Diagnóstico → Mes Fiscal
- **Entra:** 5 respuestas SIN PII (régimen, mes, ingreso aproximado auto-reportado, gastos/retenciones tri-state).
- **Proceso:** `diagnostico/page.tsx` → `createDiagnosticDraft` (`lib/diagnostico/draft.ts`, whitelist de campos) → `fiscalMonthFromDiagnosticDraft` (`mes/from-diagnostic.ts`, `incomeConfirmed=0`, `cfdis=0`).
- **Se guarda:** `localStorage` clave `wedge:diagnostic-draft` (TTL 30 días, fail-soft). NO en DB.
- **Sale:** primer Mes Fiscal (estimado). Al crear cuenta, se retoma como su Mes Fiscal.
- **Riesgos:** draft sin cifrar en equipo compartido (dato no-sensible: ingreso aproximado + respuestas). **Protecciones:** TTL 30d, botón "Borrar diagnóstico local", sin PII fuerte; `entry-mode.ts` garantiza que el **snapshot DB gana al draft** (no lo tapa).

## 2. XML/ZIP → Vista previa (client-only)
- **Entra:** archivos `.xml`/`.zip` seleccionados por el usuario (File API).
- **Proceso:** `lib/cfdi/upload.ts` (límites duros: 20 archivos, 2MB/XML, 25MB/ZIP, 1000 entradas, 64MB total; **anti zip-bomb** por `originalSize` antes de inflar; rechazo de ZIP anidado; skip `__MACOSX`) → `decodeXmlBytes` (sniff encoding ISO-8859-1/CP1252 + descarte de control-chars C0 ilegales, R7.4C) → `parseMany`/`cfdi-parser.ts` (solo texto, nunca ejecuta XML; DOM en browser / regex en Node) → `normalizeCfdi` (**enmascara RFC** `maskRfc`, **dropea UUID crudo**, deriva `id` hash no-PII).
- **Se guarda:** nada sale del navegador; el XML no se sube ni se persiste.
- **Sale:** `NormalizedCfdi[]` (en memoria, cliente).
- **Riesgos:** peor caso = DoS local de la propia pestaña (header ZIP falsificado, documentado). `inferUserRfc` es heurística; empate → "desconocido" (no adivina, no infla). **Protecciones:** client-only, límites, redacción, sin red.

## 3. Vista previa → Fiscal Inbox
- **Entra:** `NormalizedCfdi[]` → `redactCfdiForClient` (`upload.ts`) → `RedactedCfdi[]` (sin UUID/RFC/XML).
- **Proceso:** `preview-store.ts` guarda `RedactedCfdi[]` en `sessionStorage` (por-pestaña, TTL 24h, validación de forma al cargar). `inbox.ts` (puro): `effectiveStatus` respeta estados terminales (cancelado/pendienteComplemento NO se pueden "confirmar"). `/app/cfdis` recalcula EN VIVO con el mismo motor que `/app/mes`.
- **Se guarda:** `sessionStorage` (`wedge:cfdi-decisions`); las decisiones persisten solo si `source==='upload'`.
- **Sale:** decisiones temporales (confirmar/excluir/revisar) + cifras en vivo.
- **Riesgos:** bajo (todo en sesión, redactado). **Protecciones:** sin PII, estados terminales no decidibles, excluir baja el monto / confirmar-revisar no.

## 4. Fiscal Inbox → Mes Fiscal (recompute)
- **Entra:** `RedactedCfdi[]` + decisiones.
- **Proceso:** `recompute.ts` (`redactedToNormalized` reconstruye un NormalizedCfdi mínimo no-PII → `applyCfdiDecisions` → **reusa el motor canónico** `fiscalMonthFromCfdis`). `taxes.ts` (`cfdiToTransaction`) excluye REP/cancelados/moneda≠MXN/PPD-no-cobrado; deducible solo si UsoCFDI claro.
- **Se guarda:** nada nuevo (recálculo en memoria).
- **Sale:** `FiscalMonth` actualizado (consistente con el Inbox).
- **Riesgos:** divergencia conteo-vs-monto (no-MXN cuenta en conteo, no en monto) — **mitigado con copy**. **Protecciones:** un solo motor canónico; `summarizeCfdiTaxes` marcado "no usar en páginas" para evitar divergencia.

## 5. Mes Fiscal → DB Snapshot
- **Entra:** `FiscalMonth` + `source` + resúmenes (decisiones/luk) desde `SaveMesPanel.tsx` (consentimiento explícito).
- **Proceso:** `POST /api/mes/snapshot` → `requireSameOrigin` (CSRF) → `getUser()` (401 sin sesión) → `isFiscalMonthLike` → `sanitizeFiscalMonthForPersistence` (**whitelist explícita de columnas**; `projectPendingAction`/`projectRisk` descartan campos no previstos) → `assertNoSensitiveFields` (rechaza claves prohibidas + patrones RFC/UUID/`<cfdi`/email/teléfono en valores string) → `saveFiscalMonthSnapshot` (re-asserta; upsert `onConflict user_id,year,month,source`).
- **Se guarda:** tabla `fiscal_month_snapshots` (agregados redactados; **sin** columnas rfc/uuid/xml). `user_id` SIEMPRE de la sesión (nunca del body).
- **Sale:** `{ ok, id }` o 422 determinista si hay PII.
- **Riesgos:** sin rate-limit (acotado al owner por RLS); sin cota de longitud de arrays. **Protecciones:** auth + CSRF + doble red anti-PII + RLS owner-only + cliente de sesión (nunca service-role; invariante con test).

## 6. Snapshot → App (carga al entrar)
- **Entra:** sesión del usuario.
- **Proceso:** `mes/page.tsx` useEffect (hydration-safe, tras montar): `chooseMesEntryMode` → preview (sessionStorage) → `GET /api/mes/snapshot` (auth + RLS) → draft (localStorage) → demo. `fiscalMonthFromSnapshot` reconstruye el FiscalMonth desde la fila redactada. `luk/page.tsx` replica la misma prioridad (R8).
- **Se guarda:** nada (lectura).
- **Sale:** el Mes Fiscal correcto (snapshot gana al draft); sobrevive logout/login (server-side + RLS).
- **Riesgos:** flash breve demo→modo mientras resuelve el fetch (cosmético). **Protecciones:** `getUser()` (401 sin sesión), RLS owner-only en el `.eq('user_id')`.

## 7. luk (señales deterministas)
- **Entra:** `FiscalMonth` / `RedactedCfdi[]` / decisiones (datos ya existentes).
- **Proceso:** `luk/signals.ts` deriva señales **deterministas** (sin LLM, sin red); ranking estable severidad→confianza→tipo; `relatedCfdiIds` = ids hash NO sensibles. `explanations.ts` une la señal con conocimiento fiscal curado (`fiscal-knowledge`), con fallback "no inventamos contenido fiscal".
- **Se guarda:** nada (derivado en memoria); el resumen de señales sí entra (agregado) al snapshot.
- **Sale:** señales + explain cards; cada una cierra con una acción real.
- **Riesgos:** copy fiscal mantenido a mano (desactualización). **Protecciones:** sin LLM/red, sin PII en señales, límites explícitos ("luk no declara, no paga ni modifica SAT").

## Resumen de superficies de almacenamiento
| Dónde | Qué | Sensibilidad | Vida |
|---|---|---|---|
| `localStorage` | draft de diagnóstico, consent | bajo (sin PII fuerte) | 30d / persistente |
| `sessionStorage` | `RedactedCfdi[]` preview + decisiones | redactado (sin RFC/UUID/XML) | por-pestaña, 24h |
| Supabase DB | snapshot redactado (agregados) | sin PII (whitelist + assert + RLS) | persistente, owner-only |
| Navegador (memoria) | XML crudo + NormalizedCfdi (con UUID) | sensible | efímero; **nunca sale del navegador** |
| **Nunca persistido** | XML crudo, RFC/UUID completos, CIEC/e.firma/SAT | — | — |
