import { describe, it, expect } from "vitest";
import { parseOne } from "./parse";
import { normalizeCfdi } from "./normalize";
import { groupCfdisByMonth, cfdisForPeriod, periodsPresent } from "./month";
import { getDemoCfdis, XML_INGRESO_PUE, DEMO_USER_RFC } from "./fixtures";

describe("cfdi/month", () => {
  it("agrupa CFDIs por periodo YYYY-MM", () => {
    // El set demo es todo Junio 2026; agregamos uno de Mayo para verificar agrupación.
    const mayoXml = XML_INGRESO_PUE.replace(/2026-06-04/g, "2026-05-04");
    const r = parseOne(mayoXml);
    if (!r.ok) throw new Error(r.error);
    const mayo = normalizeCfdi(r.cfdi, { userRfc: DEMO_USER_RFC, source: "fixture" });

    const all = [...getDemoCfdis(), mayo];
    const grouped = groupCfdisByMonth(all);
    expect(Object.keys(grouped).sort()).toEqual(["2026-05", "2026-06"]);
    expect(grouped["2026-05"]).toHaveLength(1);
    expect(grouped["2026-06"]).toHaveLength(7);

    expect(cfdisForPeriod(all, "2026-05")).toHaveLength(1);
    expect(periodsPresent(all)).toEqual(["2026-06", "2026-05"]);
  });
});
