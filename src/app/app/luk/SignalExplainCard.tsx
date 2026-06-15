"use client";

/**
 * SignalExplainCard — una señal luk con su explain card (Fase 6B).
 * Compacta primero; la explicación (qué significa / por qué importa / qué revisar / qué sabe /
 * qué falta / siguiente acción + disclaimer) se revela al expandir. No chat, no input libre.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { Badge } from "@/design-system";
import type { LukSignal } from "@/lib/luk/types";
import type { LukExplanation } from "@/lib/luk/explanations";

const SEV_META: Record<LukSignal["severity"], { label: string; color: string }> = {
  blocker: { label: "Riesgo", color: wt.color.warning },
  warning: { label: "Atención", color: wt.color.warning },
  review: { label: "Por revisar", color: wt.color.trustBlueGray },
  info: { label: "Informativo", color: wt.color.textMuted },
};

const SOURCE_LABEL: Record<LukSignal["source"], string> = {
  fiscal_month: "Mes Fiscal",
  cfdi_inbox: "CFDIs",
  diagnostic: "Diagnóstico",
  xml_preview: "XML/ZIP",
  user_decision: "Tu decisión",
};

export function SignalExplainCard({ signal, explanation }: { signal: LukSignal; explanation: LukExplanation }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: wt.color.surface, border: `1px solid ${wt.color.border}`, borderRadius: wt.radius.lg, padding: `${wt.space[5]}px ${wt.space[6]}px` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: wt.space[2], minWidth: 0 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_META[signal.severity].color, flexShrink: 0 }} />
          <h3 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>{signal.title}</h3>
        </div>
        <div style={{ display: "flex", gap: wt.space[2], flexShrink: 0 }}>
          <Badge variant={signal.severity === "info" ? "neutral" : "warning"} size="sm">{SEV_META[signal.severity].label}</Badge>
          <Badge variant="outline" size="sm">{SOURCE_LABEL[signal.source]}</Badge>
        </div>
      </div>

      <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[3]}px 0 0` }}>{signal.summary}</p>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: wt.space[2], marginTop: wt.space[3], height: 28, padding: 0, background: "transparent", border: "none", color: wt.color.orangeInk, fontFamily: wt.font.sans, ...wt.text.label, cursor: "pointer" }}
      >
        <span>{open ? "Ocultar explicación" : "Ver explicación"}</span>
        <ChevronDown size={16} aria-hidden style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: `transform ${wt.motion.base} ${wt.motion.ease}` }} />
      </button>

      {open && (
        <div style={{ marginTop: wt.space[4], paddingTop: wt.space[4], borderTop: `1px solid ${wt.color.border}`, display: "grid", gap: wt.space[4] }}>
          <Field k="Qué significa" v={explanation.plainExplanation} />
          <Field k="Por qué importa" v={explanation.whyItMatters} />
          <FieldList k="Qué revisar" items={explanation.whatToReview} />
          <Field k="Qué sabe Wedge" v={explanation.whatWedgeKnows} />
          <Field k="Qué falta" v={explanation.whatWedgeDoesNotKnow} />
          <Field k="Siguiente acción" v={explanation.nextAction} />
          <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>{explanation.userSafeDisclaimer}</p>
        </div>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[1] }}>{k}</div>
      <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>{v}</p>
    </div>
  );
}

function FieldList({ k, items }: { k: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[1] }}>{k}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: wt.space[1] }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: wt.space[2], ...wt.text.bodySm, color: wt.color.textSecondary }}>
            <span aria-hidden style={{ display: "inline-flex", color: wt.color.textMuted, marginTop: 1 }}>·</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
