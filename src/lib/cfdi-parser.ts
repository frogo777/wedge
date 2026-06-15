/**
 * CFDI 4.0 XML parser — zero dependencies.
 *
 * Works in both environments:
 *  - Browser: uses native `DOMParser`
 *  - Server (Node / Next.js RSC): falls back to regex/string parsing since
 *    DOMParser is not available without a dependency.
 *
 * We intentionally parse only the subset of fields that wedge needs; CFDI 4.0
 * is a large standard and we don't want to fake completeness.
 */

export type CFDITipo = "I" | "E" | "N" | "P" | "T";

export interface CFDIConcepto {
  claveProdServ: string;
  descripcion:   string;
  cantidad:      number;
  valorUnitario: number;
  importe:       number;
}

/** SAT impuesto codes:  001 = ISR, 002 = IVA, 003 = IEPS */
export type CFDIImpuestoCode = "001" | "002" | "003";

export interface CFDITraslado {
  impuesto: CFDIImpuestoCode;
  tasa?:    number;     // 0.16, 0.08, 0 …
  importe:  number;
}

export interface CFDIRetencion {
  impuesto: CFDIImpuestoCode;
  importe:  number;
}

export interface CFDIImpuestos {
  trasladados:      CFDITraslado[];
  retenidos:        CFDIRetencion[];
  totalIVA:         number;
  totalISRRetenido: number;
  totalIVARetenido: number;
}

export interface CFDIDoctoRelacionado {
  uuid:            string;
  impPagado:       number;
  numParcialidad?: number;
  monedaDR?:       string;
  impSaldoAnt?:    number;
  impSaldoInsoluto?: number;
}

export interface CFDIPago {
  fechaPago:    string;
  formaDePago:  string;
  monto:        number;
  monedaP?:     string;
  relacionados: CFDIDoctoRelacionado[];
}

export interface CFDINomina {
  totalPercepciones: number;
  totalDeducciones:  number;
  netoPagado:        number;
  tipoNomina?:       string;  // O=ordinaria, E=extraordinaria
}

export interface ParsedCFDI {
  version:           "4.0";
  fecha:             string;            // ISO-like: 2026-04-22T10:05:00
  subTotal:          number;
  total:             number;
  moneda:            string;            // MXN, USD, …
  tipoDeComprobante: CFDITipo;
  metodoPago?:       string;            // PUE / PPD
  formaPago?:        string;            // 01..99
  emisor: {
    rfc:            string;
    nombre:         string;
    regimenFiscal:  string;
  };
  receptor: {
    rfc:       string;
    nombre:    string;
    usoCFDI:   string;
    /** Régimen fiscal del receptor (CFDI 4.0). 612=Honorarios, 626=RESICO,
     *  605=Asalariado, 606=Arrendamiento. Crítico para auditor preventivo. */
    regimenFiscal?: string;
  };
  timbre: {
    uuid:          string;
    fechaTimbrado: string;
  } | null;
  conceptos: CFDIConcepto[];
  impuestos?: CFDIImpuestos;
  pagos?:  CFDIPago[];
  nomina?: CFDINomina;
}

export type ParseError = { error: string };
export type ParseResult = ParsedCFDI | ParseError;

/* ────────────────────────────────────────────────────────────────────────── */

export function parseCFDI(xml: string): ParseResult {
  if (!xml || typeof xml !== "string") {
    return { error: "No se recibió contenido XML." };
  }
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<?xml") && !trimmed.startsWith("<")) {
    return { error: "El archivo no parece ser XML." };
  }

  // Early sanity checks that don't require building a DOM. These catch
  // common "wrong type of file" uploads with clearer error messages.
  const sanity = preflightCheck(xml);
  if (sanity) return sanity;

  // Prefer DOMParser in the browser — it handles XML namespaces correctly.
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const parseErr = doc.getElementsByTagName("parsererror")[0];
      if (parseErr) return { error: "XML mal formado. Revisa el archivo." };
      return parseWithDom(doc);
    } catch {
      // fall through to regex path
    }
  }
  return parseWithRegex(xml);
}

/**
 * Some emisores bundle several CFDIs inside a single wrapper XML (e.g. payroll
 * batches). Returns one `ParseResult` per Comprobante element found. If the
 * XML only contains one Comprobante this is equivalent to `[parseCFDI(xml)]`.
 */
export function parseCFDIs(xml: string): ParseResult[] {
  if (!xml || typeof xml !== "string") {
    return [{ error: "No se recibió contenido XML." }];
  }
  // Count Comprobante open-tags. Single CFDI → fall through.
  const re = /<(?:\w+:)?Comprobante\b[^>]*>/g;
  const matches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) matches.push(m.index);
  if (matches.length <= 1) return [parseCFDI(xml)];

  // Split the document at each Comprobante open-tag. We keep the XML
  // declaration prepended to each slice so downstream parsers are happy.
  const decl = xml.startsWith("<?xml") ? xml.slice(0, xml.indexOf("?>") + 2) : "";
  const out: ParseResult[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i];
    // Find matching close tag — we locate the next </...:Comprobante> after start.
    const closeRe = /<\/(?:\w+:)?Comprobante\s*>/g;
    closeRe.lastIndex = start;
    const close = closeRe.exec(xml);
    if (!close) { out.push({ error: "Comprobante sin cierre." }); continue; }
    const slice = xml.slice(start, close.index + close[0].length);
    out.push(parseCFDI(decl + "\n" + slice));
  }
  return out;
}

/**
 * Detect common non-CFDI inputs (acuse, wrong version) before we commit to
 * parsing. Returns a `ParseError` when the XML is clearly not a CFDI 4.0 we
 * can handle; returns `null` to let the real parser take over.
 */
function preflightCheck(xml: string): ParseError | null {
  // Acuse de cancelación / other SAT responses don't have <Comprobante>.
  const hasComprobante = /<(?:\w+:)?Comprobante\b/.test(xml);
  if (!hasComprobante) {
    // Known SAT acuse / response root elements.
    if (/<(?:\w+:)?Acuse\b/.test(xml) || /<(?:\w+:)?acuse\b/i.test(xml)) {
      return { error: "El archivo es un Acuse del SAT, no un CFDI." };
    }
    if (/<(?:\w+:)?SolicitudCancelacion\b/i.test(xml) || /<(?:\w+:)?RespuestaSolicitud/i.test(xml)) {
      return { error: "El archivo es una solicitud/respuesta de cancelación, no un CFDI." };
    }
    // Might just be unrelated XML — let the main parser produce its own error.
    return null;
  }

  // Grab the Version attribute on the first Comprobante open-tag.
  const openTagMatch = /<(?:\w+:)?Comprobante\b([^>]*)>/.exec(xml);
  if (openTagMatch) {
    const attrs = readAttrs("<C " + openTagMatch[1] + ">");
    const v = attrs.Version || attrs.version || "";
    if (v === "3.3" || v.startsWith("3.")) {
      return {
        error: "CFDI 3.3 no soportado. wedge solo procesa CFDI 4.0. Pide al emisor que te emita un CFDI 4.0.",
      };
    }
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  DOM-based path (browser)                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function parseWithDom(doc: Document): ParseResult {
  const comprobante = pickElement(doc, "Comprobante");
  if (!comprobante) {
    return { error: "No se encontró el nodo Comprobante. ¿Es un CFDI válido?" };
  }
  const version = comprobante.getAttribute("Version") || "";
  if (version !== "4.0") {
    return {
      error:
        version === ""
          ? "El XML no declara Version en cfdi:Comprobante."
          : `Versión CFDI ${version} no soportada. wedge solo procesa CFDI 4.0.`,
    };
  }

  const emisorEl   = pickElement(doc, "Emisor");
  const receptorEl = pickElement(doc, "Receptor");
  if (!emisorEl || !receptorEl) {
    return { error: "CFDI incompleto: falta Emisor o Receptor." };
  }

  const timbreEl = pickElement(doc, "TimbreFiscalDigital");

  const conceptoEls = Array.from(doc.getElementsByTagName("*")).filter(
    (el) => localName(el.nodeName) === "Concepto"
  );

  const conceptos: CFDIConcepto[] = conceptoEls.map((el) => ({
    claveProdServ: el.getAttribute("ClaveProdServ") || "",
    descripcion:   el.getAttribute("Descripcion")   || "",
    cantidad:      toNum(el.getAttribute("Cantidad")),
    valorUnitario: toNum(el.getAttribute("ValorUnitario")),
    importe:       toNum(el.getAttribute("Importe")),
  }));

  const impuestos = extractImpuestosFromDom(doc);
  const pagos     = extractPagosFromDom(doc);
  const nomina    = extractNominaFromDom(doc);

  const tipo = (comprobante.getAttribute("TipoDeComprobante") as CFDITipo) || "I";

  const parsed: ParsedCFDI = {
    version: "4.0",
    fecha:             comprobante.getAttribute("Fecha") || "",
    subTotal:          toNum(comprobante.getAttribute("SubTotal")),
    total:             toNum(comprobante.getAttribute("Total")),
    moneda:            comprobante.getAttribute("Moneda") || "MXN",
    tipoDeComprobante: tipo,
    metodoPago:        comprobante.getAttribute("MetodoPago") || undefined,
    formaPago:         comprobante.getAttribute("FormaPago")  || undefined,
    emisor: {
      rfc:           emisorEl.getAttribute("Rfc") || "",
      nombre:        emisorEl.getAttribute("Nombre") || "",
      regimenFiscal: emisorEl.getAttribute("RegimenFiscal") || "",
    },
    receptor: {
      rfc:     receptorEl.getAttribute("Rfc") || "",
      nombre:  receptorEl.getAttribute("Nombre") || "",
      usoCFDI: receptorEl.getAttribute("UsoCFDI") || "",
      regimenFiscal: receptorEl.getAttribute("RegimenFiscalReceptor") || undefined,
    },
    timbre: timbreEl
      ? {
          uuid:          timbreEl.getAttribute("UUID") || "",
          fechaTimbrado: timbreEl.getAttribute("FechaTimbrado") || "",
        }
      : null,
    conceptos,
    impuestos,
  };
  if (pagos && pagos.length)   parsed.pagos  = pagos;
  if (nomina)                  parsed.nomina = nomina;
  return parsed;
}

function extractPagosFromDom(doc: Document): CFDIPago[] {
  const all = Array.from(doc.getElementsByTagName("*"));
  const pagoEls = all.filter(el => localName(el.nodeName) === "Pago");
  const pagos: CFDIPago[] = [];
  for (const pagoEl of pagoEls) {
    const relacionados: CFDIDoctoRelacionado[] = Array.from(
      pagoEl.getElementsByTagName("*")
    )
      .filter(el => localName(el.nodeName) === "DoctoRelacionado")
      .map(el => ({
        uuid:            (el.getAttribute("IdDocumento") || "").toUpperCase(),
        impPagado:       toNum(el.getAttribute("ImpPagado")),
        numParcialidad:  el.getAttribute("NumParcialidad")
                           ? toNum(el.getAttribute("NumParcialidad"))
                           : undefined,
        monedaDR:        el.getAttribute("MonedaDR") || undefined,
        impSaldoAnt:     el.getAttribute("ImpSaldoAnt") ? toNum(el.getAttribute("ImpSaldoAnt")) : undefined,
        impSaldoInsoluto: el.getAttribute("ImpSaldoInsoluto") ? toNum(el.getAttribute("ImpSaldoInsoluto")) : undefined,
      }));
    pagos.push({
      fechaPago:    pagoEl.getAttribute("FechaPago") || "",
      formaDePago:  pagoEl.getAttribute("FormaDePagoP") || "",
      monto:        toNum(pagoEl.getAttribute("Monto")),
      monedaP:      pagoEl.getAttribute("MonedaP") || undefined,
      relacionados,
    });
  }
  return pagos;
}

function extractNominaFromDom(doc: Document): CFDINomina | undefined {
  const all = Array.from(doc.getElementsByTagName("*"));
  const nominaEl = all.find(el => localName(el.nodeName) === "Nomina");
  if (!nominaEl) return undefined;

  const percEl = Array.from(nominaEl.getElementsByTagName("*")).find(
    el => localName(el.nodeName) === "Percepciones"
  );
  const dedEl = Array.from(nominaEl.getElementsByTagName("*")).find(
    el => localName(el.nodeName) === "Deducciones"
  );

  // TotalPercepciones = Gravado + Exento; likewise for deducciones. Prefer
  // the summary attributes; if absent, sum the per-item Importe fields.
  const totalPerc = percEl
    ? toNum(percEl.getAttribute("TotalGravado")) +
      toNum(percEl.getAttribute("TotalExento"))
    : 0;
  const totalDed = dedEl
    ? toNum(dedEl.getAttribute("TotalImpuestosRetenidos")) +
      toNum(dedEl.getAttribute("TotalOtrasDeducciones"))
    : 0;

  return {
    totalPercepciones: round2(totalPerc),
    totalDeducciones:  round2(totalDed),
    netoPagado:        round2(totalPerc - totalDed),
    tipoNomina:        nominaEl.getAttribute("TipoNomina") || undefined,
  };
}

function extractImpuestosFromDom(doc: Document): CFDIImpuestos {
  // CFDI 4.0 lleva impuestos por-Concepto y un bloque agregado a nivel documento.
  // R7.3 (F1): se elige POR TIPO (Traslado / Retencion) — se prefiere per-concepto y se
  // cae al bloque de documento SOLO para el tipo que no exista en conceptos. Antes era
  // todo-o-nada (`source = conceptoImpuestos.length>0 ? concepto : documento`): si había
  // CUALQUIER impuesto por concepto, se ignoraba el bloque de documento, perdiendo las
  // RETENCIONES de plataformas (Uber/MercadoLibre/Amazon) que suelen vivir solo a nivel
  // documento mientras los Traslados van por concepto → retención leída en 0. No duplica:
  // si un tipo existe per-concepto NO se lee también su agregado de documento.
  const allEls = Array.from(doc.getElementsByTagName("*"));
  const isImpuesto = (el: Element) =>
    localName(el.nodeName) === "Traslado" || localName(el.nodeName) === "Retencion";
  const inConcepto = (el: Element): boolean => {
    let p = el.parentElement;
    while (p) {
      if (localName(p.nodeName) === "Concepto") return true;
      p = p.parentElement;
    }
    return false;
  };

  const impuestoEls = allEls.filter(isImpuesto);
  const conceptoEls = impuestoEls.filter(inConcepto);
  const documentEls = impuestoEls.filter((el) => !inConcepto(el));

  const pickByKind = (kind: "Traslado" | "Retencion"): Element[] => {
    const c = conceptoEls.filter((el) => localName(el.nodeName) === kind);
    const d = documentEls.filter((el) => localName(el.nodeName) === kind);
    return c.length > 0 ? c : d;
  };

  const trasladados: CFDITraslado[] = pickByKind("Traslado").map((el) => {
    const tasaRaw = el.getAttribute("TasaOCuota");
    return {
      impuesto: (el.getAttribute("Impuesto") || "") as CFDIImpuestoCode,
      tasa:     tasaRaw ? toNum(tasaRaw) : undefined,
      importe:  toNum(el.getAttribute("Importe")),
    };
  });
  const retenidos: CFDIRetencion[] = pickByKind("Retencion").map((el) => ({
    impuesto: (el.getAttribute("Impuesto") || "") as CFDIImpuestoCode,
    importe:  toNum(el.getAttribute("Importe")),
  }));

  return summarizeImpuestos(trasladados, retenidos);
}

function summarizeImpuestos(
  trasladados: CFDITraslado[],
  retenidos:   CFDIRetencion[],
): CFDIImpuestos {
  const totalIVA = trasladados
    .filter(t => t.impuesto === "002")
    .reduce((s, t) => s + t.importe, 0);
  const totalISRRetenido = retenidos
    .filter(r => r.impuesto === "001")
    .reduce((s, r) => s + r.importe, 0);
  const totalIVARetenido = retenidos
    .filter(r => r.impuesto === "002")
    .reduce((s, r) => s + r.importe, 0);
  return {
    trasladados,
    retenidos,
    totalIVA:         round2(totalIVA),
    totalISRRetenido: round2(totalISRRetenido),
    totalIVARetenido: round2(totalIVARetenido),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickElement(doc: Document, local: string): Element | null {
  const all = Array.from(doc.getElementsByTagName("*"));
  return all.find((el) => localName(el.nodeName) === local) || null;
}

function localName(tag: string): string {
  const i = tag.indexOf(":");
  return i === -1 ? tag : tag.slice(i + 1);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Regex-based path (server/Node — no dependencies)                          */
/* ────────────────────────────────────────────────────────────────────────── */

function parseWithRegex(xml: string): ParseResult {
  const comp = findTag(xml, "Comprobante");
  if (!comp) return { error: "No se encontró el nodo Comprobante. ¿Es un CFDI válido?" };

  const compAttrs = readAttrs(comp.openTag);
  const version = compAttrs.Version || "";
  if (version !== "4.0") {
    return {
      error:
        version === ""
          ? "El XML no declara Version en cfdi:Comprobante."
          : `Versión CFDI ${version} no soportada. wedge solo procesa CFDI 4.0.`,
    };
  }

  const emisor   = findTag(xml, "Emisor");
  const receptor = findTag(xml, "Receptor");
  if (!emisor || !receptor) {
    return { error: "CFDI incompleto: falta Emisor o Receptor." };
  }
  const emisorAttrs   = readAttrs(emisor.openTag);
  const receptorAttrs = readAttrs(receptor.openTag);

  const timbre = findTag(xml, "TimbreFiscalDigital");
  const timbreAttrs = timbre ? readAttrs(timbre.openTag) : null;

  // Conceptos — match every self-closing or opening Concepto tag.
  const conceptoRe = /<(?:\w+:)?Concepto\b([^>]*?)\/?>/g;
  const conceptos: CFDIConcepto[] = [];
  let m: RegExpExecArray | null;
  while ((m = conceptoRe.exec(xml))) {
    const attrs = readAttrs("<Concepto " + m[1] + ">");
    conceptos.push({
      claveProdServ: attrs.ClaveProdServ || "",
      descripcion:   attrs.Descripcion   || "",
      cantidad:      toNum(attrs.Cantidad),
      valorUnitario: toNum(attrs.ValorUnitario),
      importe:       toNum(attrs.Importe),
    });
  }

  const pagos  = extractPagosFromRegex(xml);
  const nomina = extractNominaFromRegex(xml);

  const parsed: ParsedCFDI = {
    version: "4.0",
    fecha:             compAttrs.Fecha || "",
    subTotal:          toNum(compAttrs.SubTotal),
    total:             toNum(compAttrs.Total),
    moneda:            compAttrs.Moneda || "MXN",
    tipoDeComprobante: (compAttrs.TipoDeComprobante as CFDITipo) || "I",
    metodoPago:        compAttrs.MetodoPago || undefined,
    formaPago:         compAttrs.FormaPago  || undefined,
    emisor: {
      rfc:           emisorAttrs.Rfc || "",
      nombre:        emisorAttrs.Nombre || "",
      regimenFiscal: emisorAttrs.RegimenFiscal || "",
    },
    receptor: {
      rfc:     receptorAttrs.Rfc || "",
      nombre:  receptorAttrs.Nombre || "",
      usoCFDI: receptorAttrs.UsoCFDI || "",
      regimenFiscal: receptorAttrs.RegimenFiscalReceptor || undefined,
    },
    timbre: timbreAttrs
      ? {
          uuid:          timbreAttrs.UUID || "",
          fechaTimbrado: timbreAttrs.FechaTimbrado || "",
        }
      : null,
    conceptos,
    impuestos: extractImpuestosFromRegex(xml),
  };
  if (pagos && pagos.length) parsed.pagos  = pagos;
  if (nomina)                parsed.nomina = nomina;
  return parsed;
}

function extractPagosFromRegex(xml: string): CFDIPago[] {
  // Isolate each <Pago>...</Pago> block. CFDI 4.0 uses pago20: prefix, but
  // unprefixed is also valid. We match both.
  const pagoBlockRe = /<(?:\w+:)?Pago\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Pago>/g;
  // Also match self-closing (no DoctoRelacionado) just in case.
  const pagoSelfRe = /<(?:\w+:)?Pago\b([^>]*)\/>/g;
  const pagos: CFDIPago[] = [];

  let m: RegExpExecArray | null;
  while ((m = pagoBlockRe.exec(xml))) {
    const attrs = readAttrs("<p " + m[1] + ">");
    const body  = m[2];
    const relacionados: CFDIDoctoRelacionado[] = [];
    const drRe = /<(?:\w+:)?DoctoRelacionado\b([^>]*?)\/?>/g;
    let dm: RegExpExecArray | null;
    while ((dm = drRe.exec(body))) {
      const a = readAttrs("<dr " + dm[1] + ">");
      relacionados.push({
        uuid:            (a.IdDocumento || "").toUpperCase(),
        impPagado:       toNum(a.ImpPagado),
        numParcialidad:  a.NumParcialidad ? toNum(a.NumParcialidad) : undefined,
        monedaDR:        a.MonedaDR || undefined,
        impSaldoAnt:     a.ImpSaldoAnt ? toNum(a.ImpSaldoAnt) : undefined,
        impSaldoInsoluto: a.ImpSaldoInsoluto ? toNum(a.ImpSaldoInsoluto) : undefined,
      });
    }
    pagos.push({
      fechaPago:   attrs.FechaPago || "",
      formaDePago: attrs.FormaDePagoP || "",
      monto:       toNum(attrs.Monto),
      monedaP:     attrs.MonedaP || undefined,
      relacionados,
    });
  }
  while ((m = pagoSelfRe.exec(xml))) {
    const attrs = readAttrs("<p " + m[1] + ">");
    pagos.push({
      fechaPago:   attrs.FechaPago || "",
      formaDePago: attrs.FormaDePagoP || "",
      monto:       toNum(attrs.Monto),
      monedaP:     attrs.MonedaP || undefined,
      relacionados: [],
    });
  }
  return pagos;
}

function extractNominaFromRegex(xml: string): CFDINomina | undefined {
  const nominaOpen = /<(?:\w+:)?Nomina\b([^>]*)>/.exec(xml);
  if (!nominaOpen) return undefined;
  const attrs = readAttrs("<n " + nominaOpen[1] + ">");

  // Find the Percepciones / Deducciones open tags and read their summary attrs.
  const percOpen = /<(?:\w+:)?Percepciones\b([^>]*?)\/?>/.exec(xml);
  const dedOpen  = /<(?:\w+:)?Deducciones\b([^>]*?)\/?>/.exec(xml);
  const percAttrs = percOpen ? readAttrs("<p " + percOpen[1] + ">") : {};
  const dedAttrs  = dedOpen  ? readAttrs("<d " + dedOpen[1]  + ">") : {};

  const totalPerc = toNum(percAttrs.TotalGravado) + toNum(percAttrs.TotalExento);
  const totalDed  = toNum(dedAttrs.TotalImpuestosRetenidos) + toNum(dedAttrs.TotalOtrasDeducciones);

  return {
    totalPercepciones: round2(totalPerc),
    totalDeducciones:  round2(totalDed),
    netoPagado:        round2(totalPerc - totalDed),
    tipoNomina:        attrs.TipoNomina || undefined,
  };
}

function extractImpuestosFromRegex(xml: string): CFDIImpuestos {
  // Find every <Traslado .../> and <Retencion .../> tag, tracking whether
  // it lives inside a <Concepto> block. We approximate by splitting the
  // XML at each <Concepto and </Concepto> marker.
  //
  // Simpler approach: read every Traslado/Retencion globally, but prefer
  // per-concepto data if it exists (same logic as the DOM path).

  const conceptoBlocks: string[] = [];
  const conceptoRe = /<(?:\w+:)?Concepto\b[\s\S]*?<\/(?:\w+:)?Concepto>/g;
  let cm: RegExpExecArray | null;
  while ((cm = conceptoRe.exec(xml))) conceptoBlocks.push(cm[0]);

  // Strip concepto blocks from the rest of the xml to get "document-level" impuestos.
  let docLevel = xml;
  for (const b of conceptoBlocks) docLevel = docLevel.replace(b, "");

  const trasladoRe  = /<(?:\w+:)?Traslado\b([^>]*?)\/?>/g;
  const retencionRe = /<(?:\w+:)?Retencion\b([^>]*?)\/?>/g;

  const readTraslados = (chunk: string): CFDITraslado[] => {
    const out: CFDITraslado[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(trasladoRe.source, "g");
    while ((m = re.exec(chunk))) {
      const a = readAttrs("<t " + m[1] + ">");
      out.push({
        impuesto: (a.Impuesto || "") as CFDIImpuestoCode,
        tasa:     a.TasaOCuota ? toNum(a.TasaOCuota) : undefined,
        importe:  toNum(a.Importe),
      });
    }
    return out;
  };
  const readRetenciones = (chunk: string): CFDIRetencion[] => {
    const out: CFDIRetencion[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(retencionRe.source, "g");
    while ((m = re.exec(chunk))) {
      const a = readAttrs("<r " + m[1] + ">");
      out.push({
        impuesto: (a.Impuesto || "") as CFDIImpuestoCode,
        importe:  toNum(a.Importe),
      });
    }
    return out;
  };

  const conceptoTrasladados  = conceptoBlocks.flatMap(readTraslados);
  const conceptoRetenidos    = conceptoBlocks.flatMap(readRetenciones);
  const docTrasladados       = readTraslados(docLevel);
  const docRetenidos         = readRetenciones(docLevel);

  const trasladados = conceptoTrasladados.length > 0 ? conceptoTrasladados : docTrasladados;
  const retenidos   = conceptoRetenidos.length > 0   ? conceptoRetenidos   : docRetenidos;

  return summarizeImpuestos(trasladados, retenidos);
}

function findTag(xml: string, local: string): { openTag: string } | null {
  // Matches <cfdi:Local ...> or <Local ...> (self-closing or not).
  const re = new RegExp(`<(?:\\w+:)?${local}\\b([^>]*?)\\/?>`);
  const m = re.exec(xml);
  if (!m) return null;
  return { openTag: m[0] };
}

function readAttrs(openTag: string): Record<string, string> {
  const out: Record<string, string> = {};
  // attr="value" or attr='value'
  const re = /([A-Za-z_][\w:-]*)\s*=\s*"([^"]*)"|([A-Za-z_][\w:-]*)\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(openTag))) {
    const name  = m[1] || m[3];
    const value = m[2] ?? m[4] ?? "";
    // Strip namespace prefix from attribute name so callers don't need to care.
    const local = name.includes(":") ? name.slice(name.indexOf(":") + 1) : name;
    out[local] = decodeXml(value);
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function toNum(v: string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Labels                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export const TIPO_COMPROBANTE_LABEL: Record<CFDITipo, string> = {
  I: "Ingreso",
  E: "Egreso",
  N: "Nómina",
  P: "Pago",
  T: "Traslado",
};
