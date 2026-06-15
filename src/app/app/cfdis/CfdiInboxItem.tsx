"use client";

/**
 * CfdiInboxItem — un CFDI como DECISIÓN (Fase 5C).
 *
 * Estado → impacto → (acción) → detalle expandible. No tabla técnica, no RFC/UUID/XML.
 * Las acciones (confirmar / por revisar / excluir) son temporales (estado de cliente).
 */

import { useState } from "react";
import { ChevronDown, Check, X, RotateCcw } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { StatusChip } from "@/design-system";
import type { RedactedCfdi } from "@/lib/cfdi/upload";
import { cfdiTitle, cfdiImpact, cfdiStatusChip, effectiveStatus, isDecidable, type InboxDecision } from "@/lib/cfdi/inbox";

const MXN = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
function monthLabel(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey || "—";
  return `${MESES[parseInt(m[2], 10) - 1] ?? monthKey} ${m[1]}`;
}

const ACTIONS: { key: InboxDecision; label: string; icon: React.ReactNode }[] = [
  { key: "confirmado", label: "Confirmar", icon: <Check size={14} /> },
  { key: "revisar", label: "Por revisar", icon: <RotateCcw size={14} /> },
  { key: "excluido", label: "Excluir", icon: <X size={14} /> },
];

export function CfdiInboxItem({
  cfdi,
  decision,
  onDecide,
  synced = false,
}: {
  cfdi: RedactedCfdi;
  decision?: InboxDecision;
  onDecide: (decision: InboxDecision) => void;
  /** true cuando hay un preview real (upload): la decisión se refleja en el Mes Fiscal. */
  synced?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const eff = effectiveStatus(cfdi, decision);
  const chip = cfdiStatusChip(eff);
  const decidable = isDecidable(cfdi);

  return (
    <div style={{ background: wt.color.surface, border: `1px solid ${wt.color.border}`, borderRadius: wt.radius.lg, padding: `${wt.space[5]}px ${wt.space[6]}px` }}>
      <div style={{ display: "flex", gap: wt.space[5], alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: wt.space[2], flex: 1, minWidth: 200 }}>
          <span style={{ ...wt.text.h3, color: wt.color.text }}>{cfdiTitle(cfdi)}</span>
          <span style={{ ...wt.text.caption, fontFamily: wt.font.mono, color: wt.color.textMuted, fontVariantNumeric: "tabular-nums" }}>
            {monthLabel(cfdi.monthKey)} · {MXN(cfdi.total)}
          </span>
          <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>{cfdiImpact(cfdi)}</span>
        </div>
        <StatusChip status={chip.kind} label={chip.label} size="sm" />
      </div>

      {/* Acciones temporales (solo si el comprobante admite decisión del usuario) */}
      {decidable ? (
        <>
          <div style={{ display: "flex", gap: wt.space[2], flexWrap: "wrap", marginTop: wt.space[4] }}>
            {ACTIONS.map((a) => {
              const isActive = decision === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onDecide(a.key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: wt.space[2],
                    height: 32, padding: `0 ${wt.space[3]}px`,
                    background: isActive ? wt.color.surface2 : "transparent",
                    color: isActive ? wt.color.text : wt.color.textSecondary,
                    border: `1px solid ${wt.color.border}`,
                    borderRadius: wt.radius.md, fontFamily: wt.font.sans, ...wt.text.caption,
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {a.icon}{a.label}
                </button>
              );
            })}
          </div>
          {decision && (
            <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
              {synced
                ? "Cambio temporal en esta sesión — se refleja en tu Mes Fiscal (no se guarda permanentemente ni modifica el SAT)."
                : "Cambio local de la demo en esta sesión — no modifica tu Mes Fiscal."}
            </p>
          )}
        </>
      ) : (
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: `${wt.space[4]}px 0 0` }}>
          Su estado lo define el comprobante; no requiere tu decisión aquí.
        </p>
      )}

      {/* Disclosure */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: wt.space[2], marginTop: wt.space[4], height: 28, padding: 0, background: "transparent", border: "none", color: wt.color.textMuted, fontFamily: wt.font.sans, ...wt.text.label, cursor: "pointer" }}
      >
        <span>{expanded ? "Ocultar detalle" : "Ver detalle"}</span>
        <ChevronDown size={16} aria-hidden style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: `transform ${wt.motion.base} ${wt.motion.ease}` }} />
      </button>

      {expanded && (
        <div style={{ marginTop: wt.space[4], paddingTop: wt.space[4], borderTop: `1px solid ${wt.color.border}`, ...wt.text.bodySm, color: wt.color.textSecondary, display: "grid", gap: wt.space[2] }}>
          <span style={{ fontFamily: wt.font.mono }}>Subtotal {MXN(cfdi.subtotal)} · IVA trasladado {MXN(cfdi.taxes.ivaTrasladado)}</span>
          {(cfdi.taxes.isrRetenido > 0 || cfdi.taxes.ivaRetenido > 0) && (
            <span style={{ fontFamily: wt.font.mono }}>Retenciones: ISR {MXN(cfdi.taxes.isrRetenido)} · IVA {MXN(cfdi.taxes.ivaRetenido)}</span>
          )}
          <span>{cfdi.conceptCount} {cfdi.conceptCount === 1 ? "concepto" : "conceptos"} · estimado informativo</span>
          {cfdi.warnings.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: wt.space[1] }}>
              {cfdi.warnings.map((w, i) => (
                <li key={i} style={{ color: wt.color.warningInk }}>• {w}</li>
              ))}
            </ul>
          )}
          <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>
            No mostramos RFC ni UUID. Los CFDIs no se guardan; esto es una vista previa.
          </span>
        </div>
      )}
    </div>
  );
}
