import { describe, it, expect } from "vitest";
import {
  UPLOAD_LIMITS, validateCfdiFile, validateCfdiFiles, readZipFile,
  parseUploadedCfdis, buildPreviewFromUploadedCfdis, redactCfdiForClient, inferUserRfc,
} from "./upload";
import { parseOne } from "./parse";
import { normalizeCfdi } from "./normalize";
import { zipCfdis } from "./zip";
import { XML_INGRESO_PUE, XML_INGRESO_PUE_2, XML_GASTO_IVA, DEMO_USER_RFC } from "./fixtures";

/** File real (Node 20 expone File global). */
function xmlFile(content: string, name = "factura.xml"): File {
  return new File([content], name, { type: "text/xml" });
}
function zipFile(files: Record<string, string>, name = "lote.zip"): File {
  // Uint8Array es un BlobPart válido en runtime; el cast evita el ruido del tipo
  // genérico Uint8Array<ArrayBufferLike> vs BlobPart en TS reciente.
  return new File([zipCfdis(files) as unknown as BlobPart], name, { type: "application/zip" });
}
/** File-like solo con name/size para probar límites sin alocar megabytes. */
function sizedFile(name: string, size: number): File {
  return { name, size } as unknown as File;
}

describe("cfdi/upload — validación", () => {
  it("acepta extensión .xml y .zip", () => {
    expect(validateCfdiFile(xmlFile("<x/>", "a.xml"))).toBeNull();
    expect(validateCfdiFile(zipFile({ "a.xml": "<x/>" }, "a.zip"))).toBeNull();
  });

  it("rechaza .pdf con mensaje humano", () => {
    const issue = validateCfdiFile(sizedFile("doc.pdf", 1000));
    expect(issue?.code).toBe("extension");
    expect(issue?.message).toMatch(/CFDI XML o ZIP/i);
  });

  it("rechaza XML demasiado grande", () => {
    expect(validateCfdiFile(sizedFile("big.xml", UPLOAD_LIMITS.maxXmlBytes + 1))?.code).toBe("xml_too_large");
  });

  it("rechaza ZIP demasiado grande", () => {
    expect(validateCfdiFile(sizedFile("big.zip", UPLOAD_LIMITS.maxZipBytes + 1))?.code).toBe("zip_too_large");
  });

  it("aplica el tope de número de archivos", () => {
    const many = Array.from({ length: UPLOAD_LIMITS.maxFiles + 5 }, (_, i) => xmlFile("<x/>", `f${i}.xml`));
    const { valid, issues } = validateCfdiFiles(many);
    expect(valid.length).toBeLessThanOrEqual(UPLOAD_LIMITS.maxFiles);
    expect(issues.some((i) => i.code === "too_many_files")).toBe(true);
  });
});

describe("cfdi/upload — ZIP", () => {
  it("rechaza ZIP anidado (.zip dentro de .zip)", async () => {
    const f = zipFile({ "inner.zip": "PKfake", "factura.xml": XML_INGRESO_PUE });
    const { payloads, issues } = await readZipFile(f);
    expect(payloads).toHaveLength(0);
    expect(issues[0].code).toBe("nested_zip");
  });

  it("rechaza ZIP sin .xml", async () => {
    const f = zipFile({ "readme.txt": "hola" });
    const { issues } = await readZipFile(f);
    expect(issues.some((i) => i.code === "no_xml_in_zip")).toBe(true);
  });

  it("rechaza ZIP con demasiadas entradas", async () => {
    const entries: Record<string, string> = {};
    for (let i = 0; i <= UPLOAD_LIMITS.maxZipEntries; i++) entries[`f${i}.xml`] = "<x/>";
    const { issues } = await readZipFile(zipFile(entries));
    expect(issues.some((i) => i.code === "too_many_entries")).toBe(true);
  });

  it("lee un ZIP ficticio con varios XML", async () => {
    const { payloads, issues } = await readZipFile(zipFile({ "a.xml": XML_INGRESO_PUE, "b.xml": XML_GASTO_IVA }));
    expect(payloads).toHaveLength(2);
    expect(issues).toHaveLength(0);
  });
});

describe("cfdi/upload — parseo y preview", () => {
  it("parsea varios XML ficticios", async () => {
    const { cfdis, issues } = await parseUploadedCfdis([
      xmlFile(XML_INGRESO_PUE, "ingreso.xml"),
      xmlFile(XML_GASTO_IVA, "gasto.xml"),
    ]);
    expect(cfdis).toHaveLength(2);
    expect(issues.filter((i) => i.code === "invalid_cfdi")).toHaveLength(0);
  });

  it("CFDIs SIN timbre idénticos reciben ids únicos (no colisionan en decisiones)", async () => {
    const untimbred = XML_INGRESO_PUE.replace(/<cfdi:Complemento>[\s\S]*?<\/cfdi:Complemento>/, "");
    const { cfdis } = await parseUploadedCfdis([xmlFile(untimbred, "a.xml"), xmlFile(untimbred, "b.xml")]);
    expect(cfdis).toHaveLength(2);
    expect(cfdis[0].id).not.toBe(cfdis[1].id);
  });

  it("XML inválido produce un issue humano (falla seguro)", async () => {
    const { cfdis, issues } = await parseUploadedCfdis([xmlFile("no soy xml", "malo.xml")]);
    expect(cfdis).toHaveLength(0);
    expect(issues.some((i) => i.code === "invalid_cfdi")).toBe(true);
  });

  it("genera un preview FiscalMonth desde un ZIP ficticio", async () => {
    const f = zipFile({ "ingreso.xml": XML_INGRESO_PUE, "gasto.xml": XML_GASTO_IVA });
    const res = await buildPreviewFromUploadedCfdis([f], {
      period: "2026-06", regime: "resico_pf", now: new Date("2026-06-13T00:00:00.000Z"),
    });
    expect(res.ok).toBe(true);
    expect(res.count).toBe(2);
    expect(res.month?.incomeDetected).toBe(18000); // PUE emitido por el usuario (inferido)
    expect(res.month?.cfdisIssued).toBe(1);
    expect(res.month?.cfdisReceived).toBe(1);
  });

  it("sin CFDIs válidos no genera preview", async () => {
    const res = await buildPreviewFromUploadedCfdis([xmlFile("basura", "x.xml")], { period: "2026-06" });
    expect(res.ok).toBe(false);
    expect(res.month).toBeNull();
  });

  it("infiere el RFC del usuario (el que aparece en más CFDIs)", () => {
    const a = parseOne(XML_INGRESO_PUE);
    const b = parseOne(XML_GASTO_IVA);
    if (!a.ok || !b.ok) throw new Error("fixture inválido");
    expect(inferUserRfc([a.cfdi, b.cfdi])).toBe(DEMO_USER_RFC);
  });

  it("empate de RFC → undefined (no adivina, no infla ingresos)", () => {
    // Un solo CFDI: emisor y receptor aparecen 1 vez cada uno → ambiguo.
    const a = parseOne(XML_INGRESO_PUE);
    if (!a.ok) throw new Error("fixture inválido");
    expect(inferUserRfc([a.cfdi])).toBeUndefined();
  });

  it("lote multi-mes: count es del mes dominante y avisa de los demás (no descarta en silencio)", async () => {
    const mayoXml = XML_INGRESO_PUE.replace(/2026-06-04/g, "2026-05-04");
    const f = zipFile({ "jun1.xml": XML_INGRESO_PUE, "jun2.xml": XML_INGRESO_PUE_2, "may.xml": mayoXml });
    const res = await buildPreviewFromUploadedCfdis([f], { regime: "resico_pf", now: new Date("2026-06-13T00:00:00.000Z") });
    expect(res.ok).toBe(true);
    expect(res.totalParsed).toBe(3);
    expect(res.count).toBe(2); // solo el mes dominante (2026-06)
    expect(res.periodsDetected).toEqual(["2026-06", "2026-05"]);
  });
});

describe("cfdi/upload — redacción", () => {
  it("redactCfdiForClient NO expone UUID crudo ni RFC completo", () => {
    const r = parseOne(XML_INGRESO_PUE);
    if (!r.ok) throw new Error("fixture inválido");
    const cfdi = normalizeCfdi(r.cfdi, { userRfc: DEMO_USER_RFC, source: "xml" });
    const redacted = redactCfdiForClient(cfdi);
    const json = JSON.stringify(redacted);
    expect(json).not.toContain("00000000-0000-4000-8000-000000000001"); // UUID
    expect(json).not.toContain(DEMO_USER_RFC); // RFC completo
    expect(json).not.toMatch(/Rfc|rfc/); // ni campos de RFC
    expect(redacted).not.toHaveProperty("uuid");
    expect(redacted.taxes.ivaTrasladado).toBe(2880); // sí conserva agregados útiles
  });
});
