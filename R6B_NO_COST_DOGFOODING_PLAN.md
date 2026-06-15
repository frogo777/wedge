# R6B — No-Cost Founder Dogfooding Plan (Wedge v1)

> **Fecha:** 2026-06-15 · Repo `frogo777/wedge` (`main`, `a70cd10`) · Deploy vivo
> **`https://wedge-4r7s.vercel.app`** · Supabase `awzrbeamyfvwcuzkvgvi` (free, ACTIVE_HEALTHY).
> **Objetivo:** usar Wedge en modo founder/dogfooding **sin meter dinero ni configurar servicios pagos**.
> Sin features nuevas, sin SAT, sin MCP, sin rediseños, sin tocar `wedgemx.com`.

---

## 1. Qué funciona HOY sin pagar

Todo esto corre con la infra gratuita actual (Supabase free + Vercel Hobby + deploy vivo):

| Capacidad | Estado | Nota |
|---|---|---|
| **Login con contraseña** | ✅ | No depende de email. Destino: `/app/mes`. |
| **Usuarios creados manualmente en Supabase Auth** | ✅ | Se crean + auto-confirman en el dashboard (ver §3). |
| **Mes Fiscal** (`/app/mes`) | ✅ | Cálculo ISR/IVA, pendientes, deadlines. Datos demo/locales hasta SAT. |
| **Snapshot** (`/api/mes/snapshot`) | ✅ | Persiste resumen **redactado** (sin XML/RFC/UUID crudos); `user_id` de sesión. |
| **RLS owner-only** | ✅ | Aislamiento cross-user **probado a nivel DB** (ver `R6B_NO_COST_DOGFOODING_REPORT.md`). |
| **XML/ZIP local** | ✅ | Parser CFDI en cliente; no requiere SAT ni servicios externos. |
| **Fiscal Inbox** (`/app/cfdis`) | ✅ | Bandeja de CFDIs traídos por XML/ZIP. |
| **luk** (`/app/luk`) | ✅ | Señales + explain cards (heurísticas locales, sin LLM nuevo). |
| **Settings** (`/app/settings`) | ✅ | Configuración básica de cuenta/perfil. |
| **Páginas públicas** (`/`, `/diagnostico`, `/precios`, `/seguridad`, `/luk`, `/faq`, `/soporte`, legales) | ✅ | Cargan sin sesión. |
| **Protección de rutas** (`/app/*` sin sesión → `/login`) | ✅ | Middleware `proxy.ts`. |
| **Open-redirect / CSRF same-origin** | ✅ | Guard replicado en 3 archivos; CSRF permite `wedge-*.vercel.app`. |

**Conclusión:** el bucle founder completo —crear usuario → login contraseña → Mes Fiscal → subir XML/ZIP →
ver CFDIs → luk → guardar snapshot → recargar → persiste— **funciona sin gastar**.

---

## 2. Qué queda desactivado o pendiente por costo/configuración

No bloquean el dogfooding founder, pero **no están listos** y **no se deben prometer**:

| Pendiente | Por qué | Impacto |
|---|---|---|
| **SMTP custom** | Requiere proveedor (Resend/SES/Postmark…) + config dashboard | El SMTP integrado de Supabase **solo entrega a miembros de la organización** y está rate-limited → **emails no llegan a externos**. |
| **Google OAuth** | Requiere Google Cloud Console + client secret | El botón "Continuar con Google" no funcionará hasta configurarlo. |
| **Leaked-password protection** | **Requiere plan Pro** (de pago) | Sin chequeo HaveIBeenPwned; mitigado por usar pocos usuarios manuales con buenas contraseñas. |
| **Magic links para externos** | Depende de SMTP | No usar para invitar gente todavía. |
| **Recuperación de contraseña confiable** | Depende de SMTP | El email de reset no llega a externos → recuperar contraseña hoy = recrear/actualizar el usuario en el dashboard. |

---

## 3. Cómo usar Wedge mientras tanto (founder/dogfooding)

**Crear usuarios manualmente (sin depender de email):**
1. Supabase → **Authentication → Users → Add user → Create new user**
   (`/project/awzrbeamyfvwcuzkvgvi/auth/users`).
2. Pon email + contraseña y **marca "Auto Confirm User"** (así no necesita email de confirmación).
3. Repite para cada usuario de prueba (p.ej. tú + 1 cuenta de prueba).

**Usar la app:**
- Entra por **`https://wedge-4r7s.vercel.app/login`** con email + contraseña → caes en `/app/mes`.
- Sube tus CFDIs por **XML/ZIP** (no conectes SAT). Revisa CFDIs en `/app/cfdis`, señales en `/app/luk`.
- Guarda **snapshot** del mes; recarga para confirmar persistencia.
- **No** uses "¿Olvidaste tu contraseña?" ni magic link ni Google (no entregan/funcionan sin SMTP/OAuth).
- Si olvidas una contraseña: cámbiala desde **Authentication → Users → (usuario) → Reset/Update password**
  en el dashboard.

---

## 4. Qué NO vender / NO prometer todavía

- ❌ **No abrir al público.** Es founder/dogfooding, no beta abierta.
- ❌ **No prometer signup automático confiable** (la confirmación por email no llega a externos sin SMTP).
- ❌ **No prometer "login con Google"** (no configurado).
- ❌ **No prometer correos de recuperación** (no llegan sin SMTP).
- ❌ **No prometer datos fiscales reales del SAT** (los datos son demo/locales hasta el SAT Lab).
- Mensaje honesto si alguien pregunta: *"Está en uso interno; el acceso es por invitación manual mientras
  terminamos el correo y el login social."*

---

## 5. Roadmap sin costo → con presupuesto (TAREA 5)

### Ahora (gratis, en curso)
- ✅ **Founder dogfooding sin costo** — login por contraseña + usuarios manuales auto-confirmados + Mes
  Fiscal + XML/ZIP + snapshot + RLS + luk, sobre Supabase free + Vercel Hobby.

### Después (cuando haya presupuesto, en este orden sugerido)
1. **SMTP custom** — desbloquea signup/recovery/magic-link confiables (primer gasto, el más habilitador).
2. **Google OAuth** — login social (gratis en sí, pero requiere setup; va tras SMTP).
3. **Leaked-password protection** — requiere **plan Pro** de Supabase.
4. **Sentry / PostHog** — observabilidad y analítica de producto (DSN/keys reales).
5. **Dominio propio** (p.ej. `v1.wedgemx.com`) — asignar a `wedge-4r7s` + actualizar Site URL/Redirect URLs.
6. **Usuarios de prueba reales** (beta cerrada) — solo tras SMTP + recuperación confiable.
7. **SAT Lab** — datos fiscales reales (la fase grande de producto).

### Regla de secuencia
**No avanzar a SAT/MCP hasta que el dogfooding founder esté estable** (uso continuo sin fricción, snapshot y
RLS sólidos, cero rutas muertas). Primero estabilizar lo gratis; luego invertir.

---

## 6. Pendientes manuales (acción del founder — el agente no puede)
- Activar SMTP / Google / leaked-password (dashboards + secretos).
- **Rotar** Supabase secret key + **revocar** token Vercel (ver `SECURITY_ROTATION_CHECKLIST.md`).
- **Borrar** proyecto Vercel duplicado `wedge` (ver `VERCEL_PROJECT_CLEANUP.md`).
- Pruebas E2E con correos reales (tras SMTP).
