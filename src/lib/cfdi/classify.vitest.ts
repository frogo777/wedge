import { describe, it, expect } from "vitest";
import { parseOne } from "./parse";
import { normalizeCfdi } from "./normalize";
import { classifyType, classifyDirection, isUserIncome, isUserExpense } from "./classify";
import type { CfdiExternalMeta } from "./types";
import {
  XML_INGRESO_PUE, XML_GASTO_IVA, XML_EGRESO, XML_INGRESO_PPD, XML_INGRESO_CANCELADO,
  XML_PAGO_REP, DEMO_USER_RFC,
} from "./fixtures";

function norm(xml: string, meta?: CfdiExternalMeta) {
  const r = parseOne(xml);
  if (!r.ok) throw new Error(r.error);
  return normalizeCfdi(r.cfdi, { userRfc: DEMO_USER_RFC, source: "fixture", meta });
}

describe("cfdi/classify", () => {
  it("clasifica tipo documental I/E/P", () => {
    expect(classifyType("I")).toBe("ingreso");
    expect(classifyType("E")).toBe("egreso");
    expect(classifyType("P")).toBe("pago");
    expect(classifyType("N")).toBe("nomina");
    expect(classifyType(undefined)).toBe("desconocido");
  });

  it("clasifica ingreso (emitido), gasto (recibido) y egreso", () => {
    const ingreso = norm(XML_INGRESO_PUE);
    expect(isUserIncome(ingreso.type, ingreso.direction)).toBe(true);
    expect(ingreso.status).toBe("detectado");

    const gasto = norm(XML_GASTO_IVA);
    expect(isUserExpense(gasto.type, gasto.direction)).toBe(true);
    expect(gasto.direction).toBe("recibido");

    const egreso = norm(XML_EGRESO);
    expect(egreso.type).toBe("egreso");
    expect(egreso.status).toBe("requiereRevision");
  });

  it("PPD sin complemento → pendienteComplemento", () => {
    const ppd = norm(XML_INGRESO_PPD, { hasComplementoPago: false });
    expect(ppd.status).toBe("pendienteComplemento");
  });

  it("cancelación por metadata → cancelado", () => {
    const c = norm(XML_INGRESO_CANCELADO, { satStatus: "cancelado" });
    expect(c.status).toBe("cancelado");
  });

  it("REP (tipo P) → excluido", () => {
    const rep = norm(XML_PAGO_REP);
    expect(rep.type).toBe("pago");
    expect(rep.status).toBe("excluido");
    // monthKey desde fechaPago del complemento
    expect(rep.monthKey).toBe("2026-06");
  });

  it("dirección desconocida sin RFC del usuario", () => {
    const r = parseOne(XML_INGRESO_PUE);
    if (!r.ok) throw new Error(r.error);
    expect(classifyDirection(r.cfdi, null)).toBe("desconocido");
  });
});
