/**
 * R7.5 — prioridad de entrada a /app/mes. Garantiza que el snapshot guardado en DB
 * GANA al draft de diagnóstico local (el bug: un draft viejo tapaba el Mes Fiscal guardado).
 */
import { describe, it, expect } from "vitest";
import { chooseMesEntryMode, hasUnappliedDraft, type MesEntryInputs } from "./entry-mode";

const base: MesEntryInputs = { hasPreview: false, hasSnapshot: false, hasDraft: false, draftFresh: false };

describe("R7.5 chooseMesEntryMode — el snapshot guardado gana al draft", () => {
  it("snapshot + draft fresco → 'guardado' (NO 'diagnostico'): el draft no tapa el snapshot", () => {
    expect(chooseMesEntryMode({ ...base, hasSnapshot: true, hasDraft: true, draftFresh: true })).toBe("guardado");
  });

  it("snapshot + draft viejo → 'guardado' (tampoco lo tapa un draft expirado)", () => {
    expect(chooseMesEntryMode({ ...base, hasSnapshot: true, hasDraft: true, draftFresh: false })).toBe("guardado");
  });

  it("snapshot sin draft → 'guardado'", () => {
    expect(chooseMesEntryMode({ ...base, hasSnapshot: true })).toBe("guardado");
  });

  it("sin snapshot + draft fresco → 'diagnostico' (usuario nuevo sigue funcionando)", () => {
    expect(chooseMesEntryMode({ ...base, hasDraft: true, draftFresh: true })).toBe("diagnostico");
  });

  it("sin snapshot + draft viejo → 'expirado'", () => {
    expect(chooseMesEntryMode({ ...base, hasDraft: true, draftFresh: false })).toBe("expirado");
  });

  it("sin nada → 'demo'", () => {
    expect(chooseMesEntryMode(base)).toBe("demo");
  });

  it("preview activo de esta sesión gana a todo (incluido snapshot + draft)", () => {
    expect(chooseMesEntryMode({ hasPreview: true, hasSnapshot: true, hasDraft: true, draftFresh: true })).toBe("xml-preview");
    expect(chooseMesEntryMode({ ...base, hasPreview: true })).toBe("xml-preview");
  });
});

describe("R7.5 hasUnappliedDraft — ofrecer usar el draft EXPLÍCITAMENTE (con confirmación)", () => {
  it("true solo si hay snapshot + draft y NO hay preview activo", () => {
    expect(hasUnappliedDraft({ ...base, hasSnapshot: true, hasDraft: true })).toBe(true);
  });
  it("false si no hay snapshot (el draft se muestra normal, no es 'sin aplicar')", () => {
    expect(hasUnappliedDraft({ ...base, hasDraft: true })).toBe(false);
  });
  it("false si hay preview activo (el preview manda)", () => {
    expect(hasUnappliedDraft({ ...base, hasPreview: true, hasSnapshot: true, hasDraft: true })).toBe(false);
  });
  it("false si no hay draft", () => {
    expect(hasUnappliedDraft({ ...base, hasSnapshot: true })).toBe(false);
  });
});
