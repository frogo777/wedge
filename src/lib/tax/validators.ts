/**
 * Validadores compartidos para datos fiscales.
 *
 * Centralizamos aquí todo lo que se repetía con regex sueltas y comparaciones
 * frágiles a lo largo del código (Tema 1.9, 1.10):
 *   - `isValidIsoDate("2026-13-40")` ahora rechaza fechas imposibles.
 *   - `isCancelledCfdi(tx)` matcha "cancelado" sin importar casing/espacios.
 */

/**
 * `YYYY-MM-DD` válida en calendario gregoriano. Rechaza:
 *   - Mes 13, día 40, día 0
 *   - 31 de febrero, 30 de febrero (incluso años bisiestos)
 *   - 31 de meses de 30 días (abril, junio, septiembre, noviembre)
 *
 * No es estricta con TZ — solo verifica que la fecha existe en el calendario.
 * Suficiente para validar input de usuario (formularios, body de APIs).
 */
export function isValidIsoDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year  = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day   = parseInt(m[3], 10);

  if (year < 1900 || year > 2200) return false;       // sanity range
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Días por mes (febrero ajustado por bisiesto).
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30,
                       31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Normaliza un valor de `cfdi_status` para comparación robusta.
 * Antes el código hacía `tx.cfdi_status === "cancelado"` exacto y fallaba
 * si el SAT (o un import) devolvía "Cancelado", " cancelado " o "CANCELADO".
 */
export function normalizeCfdiStatus(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

/** True si la transacción tiene CFDI cancelado, robusto a casing/whitespace. */
export function isCancelledCfdi(tx: { cfdi_status?: string | null }): boolean {
  return normalizeCfdiStatus(tx.cfdi_status) === "cancelado";
}

/**
 * True si el CFDI está "vigente" desde la perspectiva de IVA acreditable
 * y deducciones. SAT devuelve "Vigente" en consultas oficiales; los imports
 * legacy y belvo usan "timbrado". Aceptamos ambos sin romper el cálculo.
 *
 * BUG FIX: antes los cálculos hacían `cfdi_status === "timbrado"` exacto,
 * que fallaba con "Vigente"/"vigente"/"Timbrado" y silenciosamente
 * descartaba IVA acreditable legítimo → user pagaba más impuestos de lo
 * debido.
 */
export function isVigenteCfdi(tx: { cfdi_status?: string | null }): boolean {
  const s = normalizeCfdiStatus(tx.cfdi_status);
  return s === "vigente" || s === "timbrado";
}

/**
 * Formas de pago BANCARIZADAS aceptadas por SAT para deducir gastos > $2,000.
 * Catálogo c_FormaPago CFDI 4.0:
 *   02 = cheque nominativo
 *   03 = transferencia electrónica
 *   04 = tarjeta de crédito
 *   05 = monedero electrónico
 *   28 = tarjeta de débito
 *   29 = tarjeta de servicios
 *
 * Cualquier otra (01=efectivo, 08=vales) NO es bancarizada.
 */
const FORMAS_PAGO_BANCARIZADAS = new Set(["02", "03", "04", "05", "28", "29"]);

/**
 * Art. 27 fracc. III LISR: gastos > $2,000 deben pagarse con medio
 * bancarizado para ser deducibles. Si pagas en efectivo > $2K, la
 * deducción se rechaza en revisión SAT.
 *
 * - Si forma_pago no se conoce (null/undefined), asumimos bancarizado
 *   (most-permissive) para no descartar gastos legítimos donde el flag
 *   no se populó. UX trade-off: mejor confiar y advertir post-hoc.
 * - Si monto ≤ $2,000, regla no aplica → siempre deducible.
 */
export function isFormaPagoDeducible(tx: { amount?: number | null; forma_pago?: string | null }): boolean {
  const amount = Number(tx.amount || 0);
  if (amount <= 2000) return true;
  const forma = (tx.forma_pago ?? "").trim();
  if (!forma) return true; // unknown → asumimos bancarizado
  return FORMAS_PAGO_BANCARIZADAS.has(forma);
}
