# R7.2 — Real-Data Controlled Dogfooding Plan (Wedge v1)

> **Fecha:** 2026-06-15 · Deploy `https://wedge-4r7s.vercel.app` · Repo `frogo777/wedge`.
> **Objetivo:** validar Wedge con **XML/ZIP reales controlados** cargados a mano por el founder, para ver si
> el CFDI engine entiende los datos, si el Mes Fiscal/Inbox/luk ayudan, y si la persistencia es segura.
> **El agente NO hace login por UI ni ingiere datos reales** (privacidad): la carga real la hace el founder;
> el agente audita por código/render y guía.

---

## 1. Qué se probará

- **CFDI engine:** que un set real de CFDIs (emitidos y recibidos) se parsee, normalice y clasifique bien
  (ingreso/gasto/retención/PPD/cancelado), sin romperse ni leer mal.
- **Mes Fiscal (`/app/mes`):** que los números (ISR/IVA/ingresos/retenciones) sean coherentes con los CFDIs
  reales y se entiendan; que el modo `xml-preview` y los banners sean honestos.
- **Fiscal Inbox (`/app/cfdis`):** que cada CFDI sea una decisión clara (confirmar/excluir/revisar) y que
  excluir baje el estimado; que se refleje en el Mes Fiscal.
- **luk:** que las señales/explicaciones sobre datos reales sean correctas y no sobre-prometan.
- **Snapshot:** que guardar/recargar/relogin persista el **resumen redactado** y que NO se guarde nada
  sensible (RFC/UUID/XML).
- **UX/copy/privacidad:** confusión, errores, estados que parezcan "validado", o cualquier dato sensible en
  pantalla/almacenamiento.

## 2. Qué datos se usarán

- **Solo XML/ZIP reales del propio founder** (sus CFDIs 4.0 de RESICO PF / Honorarios), en su navegador.
- Idealmente un set pequeño y variado: 1–2 ingresos PUE, 1 ingreso PPD (sin REP), 1 con retención, 1 gasto
  recibido, 1 cancelado si hay. Un mes concreto (p.ej. el más reciente cerrado).
- **Nada de datos de terceros.** Nada que el founder no quiera procesar.

## 3. Qué NO se hará

- ❌ NO conectar SAT, e.firma, CIEC; NO scraping; NO descarga masiva; NO servicios pagos; NO SMTP/Google.
- ❌ NO subir XML real a ningún servicio externo (el procesamiento es 100% en el navegador).
- ❌ NO persistir XML crudo ni RFC/UUID (solo el resumen redactado del snapshot).
- ❌ NO pegar datos fiscales reales en chat, commits, ni documentos.
- ❌ NO tocar `wedgemx.com`, dominios, ni el proyecto Vercel correcto.
- ❌ NO arreglar todo: solo se corrigen P0 (seguridad / datos sensibles / cálculo roto / app inusable).

## 4. Riesgos de privacidad (a vigilar)

| Riesgo | Dónde podría pasar | Mitigación esperada (a verificar por código) |
|---|---|---|
| RFC/UUID/XML crudo en el **DOM** | Inbox/Mes/luk render | RFC enmascarado; UUID no renderizado; solo `RedactedCfdi` |
| Datos crudos en **sessionStorage** | preview-store | solo `RedactedCfdi` (sin UUID/RFC/XML), TTL 24h, por pestaña |
| Datos sensibles **persistidos** en Supabase | `/api/mes/snapshot` | whitelist de agregados + `assertNoSensitiveFields` server-side; `privacy_level=redacted_snapshot` |
| Fuga en **logs / errores / URL** | obs/logger, sanitize-error, error params | sin eco del payload; errores genéricos |
| XML real **sale del dispositivo** | upload | client-only; nada se sube |

## 5. Cómo anonimizar hallazgos

- En el reporte y en el chat: **Usuario A / Usuario B**, **RFC `XXX******`**, **UUID `…últimos 4`** como mucho,
  montos **redondeados o en rangos** ("≈ $50k"), nombres **"Emisor 1 / Receptor 1"**.
- Nunca pegar el XML ni un CFDI completo. Si un archivo tiene datos reales, tratarlo como **sensible**:
  describir el comportamiento, no el contenido.
- Capturas: si se incluyen, **tachar** RFC/UUID/nombres/montos exactos.

## 6. Criterio: "esto ya ayuda" (definición de útil)

Wedge "ya ayuda" para dogfounding con datos reales si, con sus propios CFDIs, el founder puede decir **sí** a:

1. **Entiende mis datos:** los CFDIs reales se leyeron sin romperse y la clasificación (ingreso/gasto/
   retención/PPD/cancelado) es correcta para mi caso.
2. **El número tiene sentido:** ISR/IVA/ingresos/retenciones del mes son coherentes con lo que esperaba
   (orden de magnitud correcto), y están claramente etiquetados como **estimado informativo**.
3. **Sé qué hacer:** el Inbox me deja decidir (confirmar/excluir/revisar) y veo el efecto; el Mes Fiscal me
   dice "qué falta / qué sigue".
4. **luk aclara:** al menos una señal/explicación me dijo algo útil y correcto, sin prometer que declara/paga.
5. **Es seguro:** no vi mi RFC/UUID/XML crudos en pantalla; al guardar y recargar persiste el resumen y NO
   datos sensibles; puedo borrar mi avance y salir.
6. **No engaña:** ningún estado dice "presentado/validado/declarado" cuando no lo está.

Si los 6 son **sí**, R7.2 valida el dogfooding con datos reales. Cualquier **no** se clasifica P0/P1/P2.

---

## 7. Flujo founder (pasos manuales — el agente no puede hacer login/usar datos reales)

> Pre: crea un usuario auto-confirmado en Supabase (Authentication → Users → Add user → Auto Confirm).

1. **Login** en `wedge-4r7s.vercel.app/login` con **correo + contraseña** (expandido por defecto).
2. Caes en **`/app/mes`** (modo "datos de ejemplo" al inicio).
3. En "Completar con XML/ZIP", **marca el consentimiento** y **sube tus XML/ZIP reales**.
4. Verás el **preview** (modo `xml-preview`): revisa ISR/IVA/ingresos/retenciones.
5. Ve a **Fiscal Inbox** (`/app/cfdis`).
6. Revisa cada **CFDI** (título/impacto/estado; sin RFC/UUID crudos a la vista).
7. **Confirma / excluye / marca revisión** algunos; observa que **excluir baja** el estimado.
8. Vuelve al **Mes Fiscal**; confirma que las **métricas cambian** según tus decisiones.
9. Abre **luk** (`/app/luk`): ¿las señales/explicaciones son correctas y claras?
10. **Guarda snapshot** (consentimiento) en el Mes Fiscal.
11. **Recarga**: ¿persiste como "Guardado en tu cuenta"?
12. **Logout** (Settings → Sesión, o el botón "Salir" en móvil) y **login** de nuevo: ¿sigue?
13. Prueba en **móvil** (<860px): nav inferior llega a Mes/CFDIs/luk/Ajustes/Salir.
14. Si algo confunde/rompe/parece "validado" falso: anótalo **anonimizado** (ver §5).

**Anota por cada paso** (anonimizado): ¿pasó lo esperado? ¿algo confuso/roto/inseguro? Eso alimenta la
matriz y el reporte (`R7_2_REAL_DATA_DOGFOODING_REPORT.md`).
