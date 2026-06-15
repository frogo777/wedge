"use client";

/**
 * /app/luk — luk contextual (Fase 6A).
 *
 * Centro de SEÑALES (no chatbot): luk detecta señales determinísticas en el Mes Fiscal / CFDIs /
 * decisiones y las explica (impacto/riesgo/siguiente acción/límite). Sin LLM, sin red.
 * Lee el mismo contexto que /app/mes (preview+decisiones, o diagnóstico). Auth-gated por /app.
 * "Wedge organiza · Mes Fiscal guía · luk detecta · tú validas en SAT."
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, FileText } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { AppShell, LogoLockup, Badge, PageHeader, Card, MetricCard, Alert, Button, SecurityNotice } from "@/design-system";
import { AppSidebarNav } from "@/app/app/_components/AppSidebarNav";
import { AppMobileNav } from "@/app/app/_components/AppMobileNav";
import { loadCfdiPreview, loadCfdiDecisions } from "@/lib/cfdi/preview-store";
import { fiscalMonthFromCfdiPreviewWithDecisions } from "@/lib/cfdi/recompute";
import { loadDiagnosticDraft } from "@/lib/diagnostico/draft";
import { fiscalMonthFromDiagnosticDraft } from "@/lib/mes/from-diagnostic";
import { buildLukSignals, groupLukSignals } from "@/lib/luk/signals";
import { buildLukExplanation, buildLukExplanations, type LukExplanation } from "@/lib/luk/explanations";
import type { LukSignal, LukSignalGroups } from "@/lib/luk/types";
import { SignalExplainCard } from "./SignalExplainCard";

type Ctx = "xml-preview" | "diagnostico" | null;

function emptyGroups(): LukSignalGroups {
  return { blocker: [], warning: [], review: [], info: [] };
}

export default function LukPage() {
  const router = useRouter();

  const [ctx, setCtx] = useState<Ctx>(null);
  const [signals, setSignals] = useState<LukSignal[]>([]);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    // client-only tras montar (hydration-safe): mismo contexto que /app/mes.
    const preview = loadCfdiPreview();
    if (preview) {
      const decisions = loadCfdiDecisions();
      const month = fiscalMonthFromCfdiPreviewWithDecisions(preview, decisions, { now: new Date() });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSignals(buildLukSignals({ month, cfdis: preview.cfdis, decisions, now: new Date() }));
      setMonthLabel(month.monthLabel);
      setCtx("xml-preview");
      return;
    }
    const draft = loadDiagnosticDraft();
    if (draft) {
      const month = fiscalMonthFromDiagnosticDraft(draft);
      setSignals(buildLukSignals({ month, now: new Date() }));
      setMonthLabel(month.monthLabel);
      setCtx("diagnostico");
    }
  }, []);

  const groups = ctx ? groupLukSignals(signals) : emptyGroups();
  const hasSignals = signals.length > 0;
  const explById: Record<string, LukExplanation> = {};
  for (const e of buildLukExplanations(signals)) explById[e.signalId] = e;

  return (
    <AppShell
      className="luk-shell"
      maxWidth={920}
      sidebar={<AppSidebarNav />}
      topbar={
        <div style={{ maxWidth: 920, margin: "0 auto", padding: `${wt.space[4]}px ${wt.space[6]}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[4], minWidth: 0 }}>
            <span className="luk-topbar-logo" style={{ display: "none" }}><LogoLockup variant="iconOnly" tone="dark" size="sm" /></span>
            <span style={{ ...wt.text.label, color: wt.color.text }}>luk{monthLabel ? ` · ${monthLabel}` : ""}</span>
            {ctx && <Badge variant="info">{signals.length} {signals.length === 1 ? "señal" : "señales"}</Badge>}
          </div>
          <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>copiloto fiscal contextual</span>
        </div>
      }
    >
      <style>{`
        @media (max-width: 860px) {
          .luk-shell { grid-template-columns: 1fr !important; }
          .luk-shell > aside { display: none !important; }
          .luk-topbar-logo { display: inline-flex !important; }
        }
      `}</style>

      <PageHeader
        overline="Copiloto fiscal"
        title="luk"
        description="Tu copiloto fiscal contextual. Detecta señales en tu Mes Fiscal; tú validas en SAT."
        back={{ label: "Volver al Mes Fiscal", href: "/app/mes" }}
      />

      {!ctx ? (
        /* Sin contexto */
        <Card variant="quiet" padding="comfortable">
          <div style={{ display: "flex", flexDirection: "column", gap: wt.space[4], alignItems: "flex-start" }}>
            <span style={{ display: "inline-flex", color: wt.color.textMuted }}><Sparkles size={22} /></span>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>luk todavía no tiene suficiente contexto.</h2>
            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
              Haz un diagnóstico o carga XML/ZIP en tu Mes Fiscal para que luk detecte señales.
              luk no presenta declaraciones ni modifica información en SAT.
            </p>
            <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => router.push("/app/mes")}>Volver al Mes Fiscal</Button>
              <Button variant="ghost" onClick={() => router.push("/diagnostico")}>Hacer diagnóstico</Button>
            </div>
          </div>
        </Card>
      ) : !hasSignals ? (
        <Alert variant="info" title="Sin señales conocidas por ahora">
          luk no detectó señales conocidas en este momento. Esto no sustituye tu revisión: es un estimado informativo y tú validas en SAT.
        </Alert>
      ) : (
        <>
          {/* Resumen por severidad */}
          <section style={{ marginBottom: wt.space[8] }}>
            <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Señales detectadas</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: wt.space[4] }}>
              <MetricCard label="Total" value={String(signals.length)} helper="este mes" />
              <MetricCard label="Atención" value={String(groups.warning.length + groups.blocker.length)} helper="por atender" />
              <MetricCard label="Por revisar" value={String(groups.review.length)} helper="por resolver" />
              <MetricCard label="Informativas" value={String(groups.info.length)} helper="contexto" />
            </div>
          </section>

          {/* Lista de señales con explain cards (progressive disclosure) */}
          <section style={{ display: "grid", gap: wt.space[4], marginBottom: wt.space[8] }}>
            {signals.map((s) => (
              <SignalExplainCard key={s.id} signal={s} explanation={explById[s.id] ?? buildLukExplanation(s)} />
            ))}
          </section>
        </>
      )}

      {/* Límites + CTAs */}
      <section style={{ marginBottom: wt.space[8], display: "flex", flexDirection: "column", gap: wt.space[5] }}>
        <SecurityNotice>luk no declara, no paga ni modifica información en SAT. Detecta señales para que tú revises y valides.</SecurityNotice>
        <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => router.push("/app/mes")} leftIcon={<ArrowRight size={16} />}>Volver al Mes Fiscal</Button>
          <Button variant="ghost" onClick={() => router.push("/app/cfdis")} leftIcon={<FileText size={16} />}>Revisar CFDIs</Button>
        </div>
      </section>

      <AppMobileNav />
    </AppShell>
  );
}

