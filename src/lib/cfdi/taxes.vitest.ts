import { describe, it, expect } from "vitest";
import { parseOne } from "./parse";
import { normalizeCfdi } from "./normalize";
import { cfdisToTransactions, cfdiToTransaction, summarizeCfdiTaxes } from "./taxes";
import { getDemoCfdis, XML_INGRESO_PUE, XML_INGRESO_PPD, XML_PAGO_REP, DEMO_USER_RFC } from "./fixtures";
import { buildMonthlyDeclaration } from "@/lib/tax/resico";

function norm(xml: string) {
  const r = parseOne(xml);
  if (!r.ok) throw new Error(r.error);
  return normalizeCfdi(r.cfdi, { userRfc: DEMO_USER_RFC, source: "fixture" });
}

describe("cfdi/taxes", () => {
  it("mapea ingreso a Transaction type 'in' con IVA, y gasto a 'out'", () => {
    const txs = cfdisToTransactions(getDemoCfdis());
    const ins = txs.filter((t) => t.type === "in");
    const outs = txs.filter((t) => t.type === "out");
    expect(ins.length).toBeGreaterThan(0);
    expect(outs.length).toBe(1); // el gasto ficticio
    expect(outs[0].amount).toBe(4000);
    expect(outs[0].iva).toBe(640);
  });

  it("egreso/nota de crédito NO se mapea a Transaction (se revisa aparte)", () => {
    const txs = cfdisToTransactions(getDemoCfdis());
    expect(txs.some((t) => t.cfdi_tipo === "E")).toBe(false);
  });

  it("REP (tipo P) NO infla ingresos en el motor canónico", () => {
    const ingreso = norm(XML_INGRESO_PUE);
    const rep = norm(XML_PAGO_REP);
    const txs = cfdisToTransactions([ingreso, rep]);
    const decl = buildMonthlyDeclaration(txs, "2026-06");
    // Solo el ingreso (18000) cuenta; el REP queda excluido (cfdi_tipo "P").
    expect(decl.ingresosCobrados).toBe(18000);
  });

  it("5A: un ingreso PPD NO se auto-cuenta aunque tenga complemento (se concilia en 5B)", () => {
    const r = parseOne(XML_INGRESO_PPD);
    if (!r.ok) throw new Error(r.error);
    const ppdPagado = normalizeCfdi(r.cfdi, {
      userRfc: DEMO_USER_RFC, source: "fixture", meta: { hasComplementoPago: true },
    });
    expect(cfdiToTransaction(ppdPagado)?.efectivamente_cobrado).toBe(false);
    const decl = buildMonthlyDeclaration(cfdisToTransactions([ppdPagado]), "2026-06");
    expect(decl.ingresosCobrados).toBe(0); // no se suma en el mes de emisión
  });

  it("5A: moneda distinta de MXN se excluye del auto-cálculo", () => {
    const usdXml = XML_INGRESO_PUE.replace('Moneda="MXN"', 'Moneda="USD"');
    const r = parseOne(usdXml);
    if (!r.ok) throw new Error(r.error);
    const usd = normalizeCfdi(r.cfdi, { userRfc: DEMO_USER_RFC, source: "fixture" });
    expect(cfdiToTransaction(usd)).toBeNull();
  });

  it("summarizeCfdiTaxes agrega ingresos vivos y excluye cancelados", () => {
    const s = summarizeCfdiTaxes(getDemoCfdis());
    // 3 ingresos PUE vivos + 1 PPD = 4 ingresos de usuario vivos (cancelado fuera)
    expect(s.countIncome).toBe(4);
    expect(s.countExpense).toBe(1);
    expect(s.isrRetenido).toBe(250);
  });
});
