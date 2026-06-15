# R7.2 — Real-Data Controlled Dogfooding Report (Wedge v1)

> **Fecha:** 2026-06-15 · Deploy `https://wedge-4r7s.vercel.app` (commit `64842b0`) · Repo `frogo777/wedge`.
> Acompaña a `R7_2_REAL_DATA_DOGFOODING_PLAN.md`. **Método:** auditoría por código de los 4 ejes del
> pipeline CFDI real (privacidad · parser · fiscal · snapshot) con un workflow de 4 auditores, + QA + smoke.
> **El agente NO hizo login por UI ni ingirió CFDIs reales** (privacidad); la corrida con datos reales es del
> founder (ver plan §7). **No se aplicó ningún fix** (no hubo P0; TAREA 5 = solo P0).

---

## 1. Resumen ejecutivo

- **Cero P0.** No hay crash con XML real, ni fuga/persistencia de datos sensibles, ni cálculo claramente
  falso, ni bloqueo de acceso. El pipeline es **seguro para dogfoodear con datos reales** desde el punto de
  vista de privacidad.
- **Privacidad: fuerte y verificada en código.** Los identificadores (RFC completo, UUID, nombres, XML
  crudo) se enmascaran/eliminan en el borde (RFC en `normalize`, UUID/nombres/XML en `RedactedCfdi`) **antes**
  de render, almacenamiento o red; el snapshot se redacta con whitelist + `assertNoSensitiveFields` (server,
  doble). RLS owner-only + columnas-whitelist ya verificadas en vivo (R-now/R6B).
- **Núcleo fiscal: correcto** (RESICO 113-E, Art. 96 acumulado, exclusión de cancelados/REP, PPD cash-basis,
  gate de IVA acreditable, retenciones leídas del XML, "excluir baja el estimado"). Etiquetado honesto
  ("estimado informativo / por revisar / tú validas en SAT").
- **5 hallazgos P1** específicos de datos reales (fiscal/parser) + varios P2. Ninguno bloquea el dogfooding
  founder, pero **3 deben atenderse antes de abrir a testers** (retenciones de plataformas, gasto deducible
  por default, encoding).
- **La corrida real (cargar tus CFDIs + login) sigue pendiente** y solo la puede hacer el founder.

---

## 2. Qué datos reales se probaron (anonimizado)

**Ninguno fue ingerido por el agente** — por privacidad, el agente no carga ni ve tus CFDIs. La auditoría
**razonó sobre el comportamiento con CFDIs reales** (formas que toma el XML del SAT) leyendo el código del
pipeline. La **prueba real hands-on** (login + cargar tu ZIP real de un mes con ingresos PUE/PPD, retención,
gasto recibido, cancelado) es del founder, siguiendo el plan §7, y **anonimizando** hallazgos (Usuario A/B,
`RFC XXX******`, UUID solo últimos 4, montos en rangos, "Emisor 1"). Nunca pegar XML/CFDI completo.

---

## 3. Qué funcionó (verificado en código)

- **Privacidad/redacción:** RFC enmascarado (`normalize.ts:28-33,102-104`); **UUID nunca** renderizado ni
  guardado (solo id hasheado; `RedactedCfdi` omite uuid/nombres/XML, `upload.ts:319-351`); sessionStorage =
  solo `RedactedCfdi`+agregados (`preview-store.ts:42-54`); **XML nunca sale del dispositivo** (in-memory,
  sin fetch/almacenamiento); Inbox dice "No mostramos RFC ni UUID" (`CfdiInboxItem.tsx`); logs/errores
  redactados (`logger.ts`, `with-handler.ts`, `sentry-redact.ts`); cero datos en URLs.
- **Snapshot:** columnas = whitelist agregada; `pending_actions`/`risks` re-proyectados campo-a-campo (no
  spread del cliente); `assertNoSensitiveFields` bloquea claves+patrones RFC/UUID/CFDI/email (route + save,
  doble); **422 no persiste nada**; CSRF same-origin + 401 + `user_id` del servidor; `privacy_level=
  redacted_snapshot`. (`persistence.ts`, `snapshot/route.ts`, `csrf.ts`).
- **Fiscal:** brackets RESICO 113-E exactos; Art. 96 **acumulado** (honorarios) year-aware; **cancelados y
  REP/tipo-P excluidos**; **PPD no cuenta** hasta complemento (cash-basis); IVA acreditable gateado (vigente
  + bancarizado); retenciones tomadas del importe real del XML; **excluir un CFDI sí baja el estimado**;
  `summarizeCfdiTaxes` (que incluiría PPD) es **dead-code de UI** — los números del usuario salen del motor
  canónico.
- **Parser:** prefijos de namespace (`cfdi:`/`tfd:`/`pago20:`/`nomina12:`), **3.3 y acuse/cancelación
  rechazados** con mensaje claro, nodos opcionales ausentes sin crash, múltiples Traslados/Retenciones,
  REP/Complemento de Pago 2.0, BOM tolerado, **topes anti zip-bomb** (filtro fflate por tamaño declarado,
  zip anidado rechazado, `__MACOSX` filtrado, caps de archivos/bytes/entradas), filename no confiable.

---

## 4. Qué no funcionó / riesgos con datos reales

Todo **P1/P2** (ningún P0). Los 3 primeros son los que más probablemente "muerden" con CFDIs reales:

1. **Retenciones solo a nivel documento se pierden** (`cfdi-parser.ts:375`) — el switch per-concepto-vs-
   documento es "todo o nada": si un CFDI real de plataforma (Uber/MercadoLibre/Amazon) trae Traslados por
   concepto pero Retenciones solo en el bloque de documento, **lee 0 retenciones** → subestima el ISR/IVA
   retenido (dinero ya pagado al SAT). **El mis-read fiscal real más probable.**
2. **Encoding ISO-8859-1/Windows-1252 → mojibake** (`upload.ts:112,187`) — `file.text()`/`strFromU8`
   decodifican siempre UTF-8; nombres con acentos (José, Núñez) se ven corruptos. Montos OK (ASCII).
3. **Todo gasto recibido se asume deducible/acreditable** (`taxes.ts:83-85`) — sin gate de UsoCFDI/
   indispensabilidad. En Honorarios baja el ISR; en RESICO solo el IVA. Suavizado por "estimado" + "revisa
   que sean deducibles", pero el headline ya lo incorpora.
4. **PUE se asume cobrado** en su mes de emisión (`taxes.ts:56`) — no hay forma de marcar "facturado, no
   cobrado"; un PUE impago infla ingresos. (Excluir lo saca por completo, no lo difiere.)
5. **USD mezclado en `summarizeCfdiTaxes`** (`taxes.ts:106-118`) — suma subtotales sin convertir; **pero es
   dead-code de UI** (el motor canónico sí excluye no-MXN). Riesgo real asociado (P2): la exclusión de moneda
   extranjera **no genera señal a nivel mes**, así que un mes con CFDIs USD podría mostrar "Ingresos $0" sin
   alerta.

---

## 5. Clasificación P0/P1/P2 + Matriz

### Clasificación
**P0 (arreglar ya): NINGUNO.** No hubo cálculo falso, crash con XML real, dato sensible mostrado/persistido,
snapshot peligroso, ni imposibilidad de borrar/salir.

| ID | Sev | Tipo | Hallazgo | Dónde |
|---|---|---|---|---|
| F1 | **P1** | parser/fiscal | Retenciones doc-level se pierden (CFDIs de plataforma) | `cfdi-parser.ts:375` |
| F2 | **P1** | parser | Encoding no-UTF-8 → mojibake en nombres | `upload.ts:112,187` |
| F3 | **P1** | fiscal | Gasto recibido asumido deducible sin gate UsoCFDI | `taxes.ts:83-85` |
| F4 | **P1** | fiscal | PUE asumido cobrado en mes de emisión | `taxes.ts:56` |
| F5 | **P1** | fiscal | USD sumado sin convertir en `summarizeCfdiTaxes` (dead-code UI) | `taxes.ts:106-118` |
| F6 | P2 | privacy | `issuerName` cae en `Transaction.description` (no llega a snapshot/DOM en ruta mensual; vive como `origen` en ruta anual) | `taxes.ts:59` |
| F7 | P2 | fiscal | Sin señal a nivel-mes cuando se excluyen CFDIs en moneda extranjera | `taxes.ts:51` |
| F8 | P2 | fiscal | Umbral $2,000 (Art. 27-III) evaluado sobre subtotal, no total pagado | `validators.ts:96-97` |
| F9 | P2 | parser | `PHONE_RE` (`\b\d{10}\b`) puede falso-rechazar (fail-safe, no fuga) | `persistence.ts:146` |
| F10 | P2 | parser | Nómina: sin fallback per-item; divergencia DOM/regex; slicing multi-CFDI en Addenda | `cfdi-parser.ts:324,341/583,154` |
| F11 | P2 | hygiene | `supabase/migrations/` vacío en repo (migración aplicada en vivo, no commiteada) | repo |

### Matriz por pantalla

| Pantalla | Acción | Esperado | Real | Problema | Sev | Fix sugerido |
|---|---|---|---|---|---|---|
| **Login** | Entrar con contraseña | 200; password default; sin prometer correo | ✅ 200 (verificado); cuerpo client-rendered | — | — | — |
| **Mes Fiscal** | Ver números con CFDIs reales | ISR/IVA/ingresos coherentes, "estimado" | ✅ motor correcto; **F3/F4** sesgan a la baja | Deducible-por-default; PUE asumido cobrado | P1 | Gate UsoCFDI; permitir "no cobrado" |
| **XML/ZIP upload** | Cargar XML/ZIP real | Parsea sin romper; redactado | ✅ robusto; **F2** mojibake; **F1** retenciones | Encoding; retenciones doc-level | P1 | TextDecoder por encoding; unir Retenciones doc+concepto |
| **Fiscal Inbox** | Confirmar/excluir/revisar | Excluir baja estimado; sin RFC/UUID | ✅ verificado (recompute + sin PII) | (sin forma de diferir PUE) | P1(F4) | Acción "facturado no cobrado" |
| **luk** | Explicar señales | Correcto, sin sobre-promesa | ✅ determinista/local, sin PII | — | — | — |
| **Settings** | Logout / borrar cuenta | Logout real; ARCO existe | ✅ (R7.1) | — | — | — |
| **Snapshot guardado** | Guardar/recargar/relogin | Persiste resumen redactado; nada sensible | ✅ whitelist + assert (doble), 422 no persiste | **F9** falso-rechazo posible (fail-safe) | P2 | Tratar PHONE_RE como advisory |
| **Mobile** | Navegar + logout | Bottom nav a Mes/CFDIs/luk/Ajustes/Salir | ✅ (R7.1) | — | — | — |

> "Resultado real" = **verificado en código**; las filas de runtime con CFDIs reales (números exactos,
> guardado 200 sin falso 422, mojibake visible) requieren la corrida del founder (plan §7).

---

## 6. Riesgos de privacidad

- **Sin fuga real en la ruta auditada.** Único acarreador sensible: `issuerName` → `Transaction.description`
  (F6), que **no alcanza** snapshot/DOM/sessionStorage en la ruta mensual (verificado); vive como `origen` en
  la ruta **anual** (no usada hoy). Recomendación: quitar el fallback a `issuerName` (1 línea, defensivo).
- **`PHONE_RE`** es fail-safe (sobre-bloquea, nunca filtra).
- **DB-side ya verificado** (no solo código): `fiscal_month_snapshots` tiene exactamente las columnas
  whitelisted y RLS owner-only (R-now/R6B, advisor de seguridad 0 lints). La migración **no está commiteada
  en el repo** (F11) → conviene agregar el SQL para reproducibilidad.
- Reglas de anonimización reafirmadas (plan §5) para cualquier hallazgo del founder.

---

## 7. Qué mejorar antes de abrir a testers

En orden de impacto (todos P1/P2 — fuera del scope "solo P0" de R7.2, para una fase siguiente):
1. **F1 — Retenciones doc-level** (unir Retenciones de documento + Traslados por concepto). *El más
   importante:* afecta el dinero ya retenido de freelancers de plataformas.
2. **F3/F4 — Supuestos fiscales optimistas:** no asumir todo gasto deducible (gate UsoCFDI o "por
   clasificar"); permitir marcar PUE "facturado no cobrado". Para que el headline no subestime el impuesto.
3. **F2 — Encoding:** decodificar ISO-8859-1/Windows-1252 antes de parsear (o avisar) para que los nombres no
   salgan corruptos.
4. **F7 — Señal de moneda extranjera** a nivel mes (que "$0" no se confunda con "no debes nada").
5. **F6 — Quitar fallback `issuerName`** (defensa en profundidad de privacidad).
6. **F11 — Commitear la migración** `fiscal_month_snapshots` al repo.
7. P2 restantes (umbral $2k sobre total, nómina, divergencia DOM/regex) como pulido.

---

## 8. Qué NO hacer todavía

- ❌ NO SAT automático, MCP, e.firma, CIEC, scraping, descarga masiva, servicios pagos, SMTP, Google OAuth,
  dominios, ni tocar `wedgemx.com`.
- ❌ NO abrir a testers reales hasta cerrar F1 (retenciones) + F3/F4 (supuestos fiscales) + F2 (encoding) —
  con CFDIs reales esos sesgos pueden dar un número que el tester tome como verdad.
- ❌ NO prometer "cálculo exacto/declaración lista": Wedge da un **estimado informativo**; el usuario valida
  y presenta en SAT.
- ❌ NO subir XML real a servicios externos; NO persistir XML/RFC/UUID crudos (ya garantizado).

---

## 9. Recomendación final

**El pipeline es seguro y el núcleo fiscal es correcto:** el founder puede **dogfoodear con sus CFDIs reales
sin riesgo de fuga de datos** — RFC/UUID/XML nunca se exponen ni persisten, el snapshot guarda solo un
resumen redactado, y la matemática base (RESICO/Honorarios, cancelados/REP/PPD, retenciones del XML) es
correcta y honestamente etiquetada como estimado.

**Antes de abrir a testers reales**, atender los P1 fiscales/parser (F1 retenciones de plataformas, F3/F4
supuestos deducible/cobrado, F2 encoding), porque con datos reales sesgan el número que el usuario ve. Como
**no hubo P0**, no se corrigió nada en R7.2 (correcto): todo queda documentado para una fase de fixes
fiscales dedicada (sugerido **R7.3 — correcciones fiscales de datos reales**), que **no** requiere servicios
pagos ni SAT real.

**Pendientes manuales del founder (siguen):** rotar Supabase secret + revocar token Vercel; borrar el
proyecto Vercel duplicado `wedge`; y la corrida hands-on con CFDIs reales (plan §7).
