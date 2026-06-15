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

| Qué | Esperado |
|---|---|
| Carga | Procesa sin tronar; muestra "N CFDIs leídos en este navegador" |
| CFDIs detectados | ~12 (junio) |
| Ingresos | Sí — varios ingresos emitidos |
| **Ingresos cobrados (aprox)** | **≈ $58,000** (5 ingresos de $10k + 1 de $8k; el PPD/USD no cuentan) |
| Gastos | Sí — 2 gastos recibidos (uno deducible G03, uno "por revisar" S01) |
| **Retenciones** | **Detectadas, NO en $0** (ISR ≈ $375 total; incl. una a nivel documento) |
| Retención a nivel documento (caso 05) | Se lee (no queda en $0) — valida el fix F1 |
| PPD (caso 06) | Marcado "pendiente de complemento"; **no** contado como cobrado |
| REP (caso 07) | **No** contado como ingreso nuevo |
| USD (caso 11) | **Excluido** del cálculo + aviso de moneda |
| Encoding ISO (caso 12) | Si se mostrara un nombre, **con acentos correctos** (sin "�") |
| Gasto S01 (caso 09) | **No** asumido deducible (por revisar) |
| luk | Al menos una señal/explicación útil (retenciones / PPD / gastos por revisar) |
| Snapshot | Guarda y persiste tras recargar; **sin** RFC/UUID/XML crudos |
| Multi-mes (opcional) | Sube `wedge-cfdi-multimonth.zip` → aviso "varios meses" |

## Qué reportarme (anonimizado)
- ¿Cargó sin tronar? ¿Cuántos CFDIs detectó?
- ¿Las **retenciones** salieron > $0 (incl. el caso 05 de nivel documento)?
- ¿El **PPD** quedó como pendiente (no cobrado)? ¿El **USD** se excluyó?
- ¿luk dijo algo útil? ¿Algo confuso o roto?
- ¿Guardar + recargar funcionó? ¿Viste algún RFC/UUID **completo** en pantalla?

Con eso cierro la matriz de R7.4A. (Recuerda: estos son datos **sintéticos**; los números no son tu situación
real — es para validar que el flujo y el parser funcionan.)
