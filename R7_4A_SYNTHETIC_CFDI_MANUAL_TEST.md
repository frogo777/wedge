# R7.4A — Guía de prueba manual con el paquete sintético (founder)

> **No requiere CFDIs reales.** Usas el ZIP sintético del repo. Deploy: `https://wedge-4r7s.vercel.app`.
> Archivo a subir: `fixtures/cfdi/synthetic/zip/wedge-cfdi-synthetic-pack.zip` (genéralo con
> `npm run fixtures:cfdi` si no existe). Privacidad: son datos falsos; aun así, no compartas capturas con
> datos que no quieras mostrar.

## Antes de empezar
- Ten un usuario en Supabase (Authentication → Users → Add user → **Auto Confirm User**).
- Descarga a tu equipo el archivo `wedge-cfdi-synthetic-pack.zip` (para poder seleccionarlo en el navegador).

## Pasos

1. **Login:** `https://wedge-4r7s.vercel.app/login` con correo + contraseña.
2. Ve a **`/app/mes`** (menú izquierdo → **"Mes"**).
3. **⚠️ Si ves arriba "Tu Mes Fiscal empezó con tu diagnóstico":** haz clic en **"Borrar diagnóstico
   local →"**. (El cargador de XML se oculta en modo diagnóstico — hallazgo P1 conocido. Esto lo destraba.)
4. Baja a la tarjeta **"Completar con XML/ZIP"** → **marca la casilla** de consentimiento ☑️.
5. **"Seleccionar XML/ZIP"** → elige `wedge-cfdi-synthetic-pack.zip`.
6. **"Procesar XML/ZIP"**.
7. Confirma que **detecta CFDIs** (no truena).
8. Ve a **Fiscal Inbox** ("Revisar CFDIs" o el menú **"CFDIs"**).
9. **Confirma / excluye / marca revisión** un par de CFDIs (prueba excluir uno de ingreso).
10. Vuelve a **Mes Fiscal**.
11. Confirma que las **métricas cambian** (excluir baja el estimado).
12. Abre **luk** (`/app/luk`).
13. **Guarda snapshot** (con consentimiento).
14. **Recarga** la página.
15. Confirma **persistencia** ("Guardado en tu cuenta").
16. **Logout** (Settings → Sesión, o "Salir" en móvil) y **login** de nuevo → confirma que sigue.

## Resultados esperados (con `wedge-cfdi-synthetic-pack.zip`)

> Números **exactos**, verificados por el test de reconciliación `synthetic-reconciliation.vitest.ts`
> (reconciliados con R7.4B). Requiere el deploy con el fix de encoding (R7.4B) para que el caso ISO cuente.

**Fiscal Inbox (`/app/cfdis`):**
| Métrica | Esperado |
|---|---|
| CFDIs detectados (total) | **12** |
| Ingresos | **8** (incluye PPD y USD como "detectados") |
| Gastos | **2** (G03 deducible · S01 por revisar) |
| Requieren revisión | **6** (las 3 con retención + egreso + USD) |
| Ingresos detectados ($) | **$50,000–$58,000**: el monto canónico es **$58,000** (USD excluido). *Si ves $50,000 y solo 11 CFDIs → el caso ISO se cayó: falta el deploy de R7.4B.* |
| **Retenciones** | **$3,575** = ISR **$375** + IVA **$3,200** (incluye la del caso 05 a nivel documento) |
| Cancelados | **0** (el pack no incluye un cancelado; el estatus de cancelación no viaja en el XML) |
| Pendientes de complemento (PPD) | **1** (caso 06) |
| luk | **≥1 señal** — principal: PPD sin complemento |

**Mes Fiscal (`/app/mes`):**
| Métrica | Esperado |
|---|---|
| CFDIs leídos | **12** |
| Siguiente acción | **"Confirmar 6 ingresos cobrados"** por **$58,000** (6 = los 5 de $10k + el ISO de $8k; ya **no** infla con el USD) |
| ISR/IVA | Estimado informativo (sube/baja al excluir CFDIs en el Inbox) |

**Por caso:** retención nivel-documento (05) se lee (no $0) · PPD (06) "pendiente de complemento", no cobrado ·
REP (07) no es ingreso nuevo · gasto G03 (08) deducible / S01 (09) por revisar · egreso (10) por revisar ·
USD (11) excluido del cálculo + aviso de moneda · ISO (12) acentos correctos (sin "�"). Multi-mes: sube
`wedge-cfdi-multimonth.zip` → aviso "varios meses".

> **Por qué Inbox dice 8 ingresos y Mes dice 6:** el Inbox cuenta **todos** los ingresos detectados (incluye
> el PPD y el USD); el Mes Fiscal cuenta los **6 cobrables en MXN** que puedes confirmar ya (el PPD va aparte
> hasta su complemento; el USD se excluye por moneda). Ambas cifras son correctas — miden cosas distintas.

## Qué reportarme (anonimizado)
- ¿Cargó sin tronar? ¿Cuántos CFDIs detectó?
- ¿Las **retenciones** salieron > $0 (incl. el caso 05 de nivel documento)?
- ¿El **PPD** quedó como pendiente (no cobrado)? ¿El **USD** se excluyó?
- ¿luk dijo algo útil? ¿Algo confuso o roto?
- ¿Guardar + recargar funcionó? ¿Viste algún RFC/UUID **completo** en pantalla?

Con eso cierro la matriz de R7.4A. (Recuerda: estos son datos **sintéticos**; los números no son tu situación
real — es para validar que el flujo y el parser funcionan.)
