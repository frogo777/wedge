import { describe, it, expect } from "vitest";
import { zipCfdis, unzipCfdis } from "./zip";
import { parseBatch } from "./parse";
import { XML_INGRESO_PUE, XML_GASTO_IVA } from "./fixtures";

describe("cfdi/zip (round-trip local, ficticio)", () => {
  it("comprime y descomprime CFDIs ficticios, ignorando no-XML", () => {
    const bytes = zipCfdis({
      "ingreso.xml": XML_INGRESO_PUE,
      "gasto.xml": XML_GASTO_IVA,
      "metadata.txt": "no es un cfdi",
    });
    const entries = unzipCfdis(bytes);
    expect(entries).toHaveLength(2); // solo los .xml
    const xmls = entries.map((e) => e.xml);
    const parsed = parseBatch(xmls);
    expect(parsed.every((p) => p.ok)).toBe(true);
  });

  it("falla seguro con bytes que no son ZIP (devuelve [])", () => {
    expect(unzipCfdis(new Uint8Array([1, 2, 3, 4]))).toEqual([]);
  });
});
