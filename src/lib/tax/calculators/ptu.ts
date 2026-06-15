/**
 * Participación de los Trabajadores en las Utilidades (PTU).
 *
 * Implementa Art. 117-126 LFT y Art. 9 LISR. Resolución de la Comisión
 * Nacional para la Participación de los Trabajadores en las Utilidades
 * (DOF 2020): el porcentaje a repartir es 10% de la utilidad fiscal.
 *
 * Mecánica:
 *  1. PTU total = utilidad fiscal × 10%.
 *  2. Se reparte en DOS MITADES iguales (Art. 123 LFT):
 *       - 50% en proporción a los DÍAS trabajados durante el año.
 *       - 50% en proporción a los SALARIOS devengados durante el año.
 *  3. TOPE INDIVIDUAL (reforma 2021, Art. 127 frac. VIII LFT):
 *       Cada trabajador NO puede recibir más del MAYOR entre:
 *         a) 3 meses de su salario, o
 *         b) el promedio de la PTU recibida en los últimos 3 años.
 *       Esta calculadora soporta el caso (a). Si el caller conoce el
 *       promedio de los 3 años previos, puede pasarlo por empleado.
 *  4. Plazo de pago: 60 días naturales después de la fecha en que se
 *     debió presentar la declaración anual (Art. 122 LFT). Para PM con
 *     ejercicio del 1-ene al 31-dic ⇒ 31 de marzo + 60 días = 30 de mayo.
 *
 * Trabajadores excluidos (Art. 127 LFT) — no se incluyen en la lista:
 *   - Directores, administradores y gerentes generales.
 *   - Trabajadores eventuales con < 60 días en el año.
 *   - Profesionales, técnicos, artesanos en servicios independientes.
 *   - Trabajadores domésticos.
 */

import { round2 } from "../resico";

export interface PtuEmpleadoInput {
  id: string;
  nombre?: string;
  /** Días efectivamente trabajados durante el ejercicio (incl. vacaciones y maternidad). */
  diasTrabajados: number;
  /** Salario diario base (cuota diaria, sin prestaciones). */
  salarioDiario: number;
  /**
   * Promedio anual de PTU de los 3 ejercicios previos. Si se proporciona
   * y es mayor al tope de 3 meses, se usa como tope individual (Art. 127
   * frac. VIII LFT, reforma 2021). Si se omite, se usa 3 meses de salario.
   */
  promedioPtu3Anios?: number;
}

export interface PtuEmpleadoOutput {
  id: string;
  nombre: string;
  diasTrabajados: number;
  salarioDevengado: number;
  porDias: number;
  porSalario: number;
  ptuCalculada: number;
  topeIndividual: number;
  ptuFinal: number;
  topeAplicado: boolean;
}

export interface CalcPtuInput {
  /** Utilidad fiscal del ejercicio (Art. 9 LISR). */
  utilidadFiscal: number;
  empleados: PtuEmpleadoInput[];
  /**
   * Fecha en que se presentó (o debe presentarse) la declaración anual,
   * formato YYYY-MM-DD. Si se omite, se asume 31 de marzo del año siguiente
   * (PM con ejercicio calendario).
   */
  fechaDeclaracionAnual?: string;
}

export interface CalcPtuOk {
  ok: true;
  ptuTotal: number;
  ptuDistribuida: number;        // suma de ptuFinal de empleados (puede < total por tope)
  ptuExcedentePorTope: number;   // diferencia entre total y distribuida
  totalDias: number;
  totalSalarios: number;
  fechaLimitePago: string;       // YYYY-MM-DD
  empleados: PtuEmpleadoOutput[];
  breakdown: string[];
}

export type CalcPtuResult = CalcPtuOk | { ok: false; error: string };

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function calcPtu(input: CalcPtuInput): CalcPtuResult {
  const utilidad = Number(input.utilidadFiscal);
  if (!Number.isFinite(utilidad)) {
    return { ok: false, error: "utilidadFiscal debe ser numérico" };
  }
  if (!Array.isArray(input.empleados) || input.empleados.length === 0) {
    return { ok: false, error: "empleados debe ser un arreglo no vacío" };
  }
  for (const e of input.empleados) {
    if (!e.id) return { ok: false, error: "cada empleado requiere id" };
    if (!Number.isFinite(e.diasTrabajados) || e.diasTrabajados < 0)
      return { ok: false, error: `diasTrabajados inválido para ${e.id}` };
    if (!Number.isFinite(e.salarioDiario) || e.salarioDiario < 0)
      return { ok: false, error: `salarioDiario inválido para ${e.id}` };
  }

  // Sin utilidad → no hay PTU. (También aplica para utilidad < 0, aunque
  // legalmente eso significa pérdida fiscal y la base para PTU sería 0).
  const ptuTotal = round2(Math.max(0, utilidad) * 0.10);

  const totalDias = round2(input.empleados.reduce((s, e) => s + e.diasTrabajados, 0));
  const totalSalarios = round2(
    input.empleados.reduce((s, e) => s + e.salarioDiario * e.diasTrabajados, 0),
  );

  const mitad = ptuTotal / 2;

  const empleadosOut: PtuEmpleadoOutput[] = input.empleados.map((e) => {
    const salarioDev = round2(e.salarioDiario * e.diasTrabajados);
    const porDias = totalDias === 0 ? 0 : round2((e.diasTrabajados / totalDias) * mitad);
    const porSalario = totalSalarios === 0 ? 0 : round2((salarioDev / totalSalarios) * mitad);
    const calculada = round2(porDias + porSalario);

    const tope3Meses = round2(e.salarioDiario * 90);
    const topePromedio = e.promedioPtu3Anios && e.promedioPtu3Anios > 0
      ? round2(e.promedioPtu3Anios) : 0;
    const tope = Math.max(tope3Meses, topePromedio);
    const final = Math.min(calculada, tope);

    return {
      id: e.id,
      nombre: e.nombre ?? e.id,
      diasTrabajados: e.diasTrabajados,
      salarioDevengado: salarioDev,
      porDias,
      porSalario,
      ptuCalculada: calculada,
      topeIndividual: tope,
      ptuFinal: round2(final),
      topeAplicado: calculada > tope,
    };
  });

  const distribuida = round2(empleadosOut.reduce((s, e) => s + e.ptuFinal, 0));
  const excedente = round2(Math.max(0, ptuTotal - distribuida));

  const fechaDecl = input.fechaDeclaracionAnual && /^\d{4}-\d{2}-\d{2}$/.test(input.fechaDeclaracionAnual)
    ? input.fechaDeclaracionAnual
    : `${new Date().getUTCFullYear()}-03-31`;
  const fechaLimitePago = addDays(fechaDecl, 60);

  const $ = (n: number) =>
    "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const breakdown: string[] = [
    `Utilidad fiscal del ejercicio: ${$(utilidad)} (Art. 9 LISR)`,
    `PTU total a repartir (10%): ${$(ptuTotal)}`,
    `Mitad por días (${$(mitad)}) + mitad por salarios (${$(mitad)})`,
    `Total días trabajados: ${totalDias.toFixed(0)}`,
    `Total salarios devengados: ${$(totalSalarios)}`,
    `PTU distribuida (después de tope individual): ${$(distribuida)}`,
    excedente > 0
      ? `Excedente por tope (Art. 127-VIII LFT): ${$(excedente)} → reintegra al patrón`
      : `Sin excedente — todos los empleados quedaron bajo el tope`,
    `Plazo de pago: ${fechaLimitePago} (Art. 122 LFT — 60 días post declaración anual)`,
  ];

  return {
    ok: true,
    ptuTotal,
    ptuDistribuida: distribuida,
    ptuExcedentePorTope: excedente,
    totalDias,
    totalSalarios,
    fechaLimitePago,
    empleados: empleadosOut,
    breakdown,
  };
}
