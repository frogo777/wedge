"use client";

/**
 * /app/cfdis — Fiscal Inbox (Fase 5C).
 *
 * Bandeja donde cada CFDI es una DECISIÓN (estado → impacto → riesgo → acción), no una tabla.
 * Lee el preview redactado de sessionStorage (cargado en /app/mes) o una demo ficticia.
 * Client-only, sin persistencia, sin SAT. Auth-gated por `proxy.ts` (/app PROTECTED).
 * "Wedge prepara; tú validas en SAT."
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, FlaskConical, Sparkles, ArrowRight } from "lucide-react";
import { wt } from "@/design-system/tokens";
import {
  AppShell, LogoLockup, Badge, PageHeader, Card, MetricCard, StatusChip,
  Alert, Button, SecurityNotice, TrustPanel, PermissionList,
} from "@/design-system";
import { AppSidebarNav } from "@/app/app/_components/AppSidebarNav";
import { CfdiInboxItem } from "./CfdiInboxItem";
import {
  loadCfdiPreview, clearCfdiPreview, redactPreviewForStorage,
  saveCfdiDecisions, loadCfdiDecisions, clearCfdiDecisions,
  type StoredCfdiPreview,
} from "@/lib/cfdi/preview-store";
import { getDemoCfdis } from "@/lib/cfdi/fixtures";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { redactedToNormalized } from "@/lib/cfdi/recompute";
import type { RedactedCfdi } from "@/lib/cfdi/upload";
import {
  inboxSummary, filterItems, summarizeCfdiDecisions, applyCfdiDecisions,
  type InboxDecision, type InboxFilter,
} from "@/lib/cfdi/inbox";
import { buildLukSignals, getPrimaryLukSignal } from "@/lib/luk/signals";
import { buildLukExplanation } from "@/lib/luk/explanations";

const MXN = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

type Source = "upload" | "demo" | null;

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "revision", label: "Requieren revisión" },
  { key: "ingresos", label: "Ingresos" },
  { key: "gastos", label: "Gastos" },
  { key: "retenciones", label: "Retenciones" },
  { key: "cancelados", label: "Cancelados" },
  { key: "excluidos", label: "Excluidos" },
];

export default function FiscalInboxPage() {
  const router = useRouter();

  const [source, setSource] = useState<Source>(null);
  const [items, setItems] = useState<RedactedCfdi[]>([]);
  const [head, setHead] = useState<{ monthLabel: string; regimeLabel: string }>({ monthLabel: "", regimeLabel: "RESICO PF" });
  const [decisions, setDecisions] = useState<Record<string, InboxDecision>>({});
  const [filter, setFilter] = useState<InboxFilter>("todos");

  const applyPreview = useCallback((p: StoredCfdiPreview) => {
    setItems(p.cfdis);
    setHead({ monthLabel: p.monthLabel, regimeLabel: p.regimeLabel });
    setDecisions(loadCfdiDecisions()); // restaura decisiones temporales de esta sesión
    setSource(p.source);
  }, []);

  const loadDemo = useCallback(() => {
    const demo = getDemoCfdis();
    const month = fiscalMonthFromCfdis(demo, { period: "2026-06", regime: "resico_pf", now: new Date() });
    setItems(redactPreviewForStorage(demo));
    setHead({ monthLabel: month.monthLabel, regimeLabel: month.regimeLabel });
    setDecisions({});
    setSource("demo");
  }, []);

  // sessionStorage es client-only → leer tras montar (hydration-safe). Las funciones
  // (useCallback estables) hacen los setState fuera del cuerpo del efecto.
  useEffect(() => {
    const wantsDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    const preview = loadCfdiPreview();
    // sessionStorage es client-only: aplicar el preview tras montar es el patrón hydration-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preview) applyPreview(preview);
    else if (wantsDemo) loadDemo();
  }, [applyPreview, loadDemo]);

  const onDecide = (id: string, decision: InboxDecision) => {
    const next = { ...decisions };
    if (next[id] === decision) delete next[id];
    else next[id] = decision;
    setDecisions(next);
    // Persistir solo cuando hay un preview real (upload) → sincroniza con el Mes Fiscal.
    if (source === "upload") saveCfdiDecisions(next);
  };

  const handleClear = () => {
    clearCfdiPreview();
    clearCfdiDecisions();
    setItems([]);
    setSource(null);
    setDecisions({});
  };

  const sum = inboxSummary(items, decisions);
  const decisionCounts = summarizeCfdiDecisions(items, decisions);
  const visible = filterItems(items, decisions, filter);
  const hasData = source !== null && items.length > 0;
  const hasDecisions = Object.keys(decisions).length > 0;

  // Cifras EN VIVO: mismo motor que /app/mes, aplicando las decisiones → ambas pantallas
  // coinciden (excluir un CFDI baja el monto aquí también, no solo en el Mes Fiscal).
  const liveMonth = useMemo(() => {
    if (items.length === 0) return null;
    const effective = applyCfdiDecisions(items, decisions).map(redactedToNormalized);
    return fiscalMonthFromCfdis(effective, {
      regime: /honorarios/i.test(head.regimeLabel) ? "honorarios" : "resico_pf",
      regimeLabel: head.regimeLabel,
      monthLabel: head.monthLabel,
      now: new Date(),
    });
  }, [items, decisions, head]);

  // luk contextual (6A): señal principal sobre estos CFDIs.
  const lukSignals = useMemo(
    () => (liveMonth ? buildLukSignals({ month: liveMonth, cfdis: items, decisions, now: new Date() }) : []),
    [liveMonth, items, decisions],
  );
  const lukPrimary = getPrimaryLukSignal(lukSignals);
  const lukPrimaryExpl = lukPrimary ? buildLukExplanation(lukPrimary) : null;
  const sourceBadge = source === "demo" ? "Datos ficticios" : source === "upload" ? "Vista previa XML/ZIP" : "";

  return (
    <AppShell
      className="cfdis-shell"
      maxWidth={920}
      sidebar={<AppSidebarNav />}
      topbar={
        <div style={{ maxWidth: 920, margin: "0 auto", padding: `${wt.space[4]}px ${wt.space[6]}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[4], minWidth: 0 }}>
            <span className="cfdis-topbar-logo" style={{ display: "none" }}><LogoLockup variant="iconOnly" tone="dark" size="sm" /></span>
            <span style={{ ...wt.text.label, color: wt.color.text }}>CFDIs{head.monthLabel ? ` · ${head.monthLabel}` : ""}</span>
            {sourceBadge && <Badge variant={source === "demo" ? "neutral" : "info"}>{sourceBadge}</Badge>}
          </div>
          <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>{head.regimeLabel}</span>
        </div>
      }
    >
      <style>{`
        @media (max-width: 860px) {
          .cfdis-shell { grid-template-columns: 1fr !important; }
          .cfdis-shell > aside { display: none !important; }
          .cfdis-topbar-logo { display: inline-flex !important; }
        }
      `}</style>

      <PageHeader
        overline="Fiscal Inbox"
        title="CFDIs"
        description="Revisa los comprobantes que pueden afectar tu Mes Fiscal. Wedge prepara; tú validas en SAT."
        back={{ label: "Volver al Mes Fiscal", href: "/app/mes" }}
      />

      {!hasData ? (
        /* Empty state */
        <Card variant="quiet" padding="comfortable">
          <div style={{ display: "flex", flexDirection: "column", gap: wt.space[4], alignItems: "flex-start" }}>
            <span style={{ display: "inline-flex", color: wt.color.textMuted }}><FileText size={22} /></span>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>Aún no hay CFDIs cargados.</h2>
            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
              Carga tus XML/ZIP en el Mes Fiscal para revisarlos aquí, o prueba con datos ficticios.
              No se conecta al SAT y no se guarda permanentemente en esta fase.
            </p>
            <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => router.push("/app/mes")}>Volver al Mes Fiscal</Button>
              <Button variant="ghost" onClick={loadDemo} leftIcon={<FlaskConical size={16} />}>Usar demo ficticia</Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {source === "demo" && (
            <div style={{ marginBottom: wt.space[6] }}>
              <Alert variant="info" title="Estás viendo CFDIs ficticios">
                Estos comprobantes son de ejemplo para explorar la bandeja. Carga tus XML/ZIP en el Mes Fiscal para ver los tuyos.
              </Alert>
            </div>
          )}

          {/* Resumen */}
          <section style={{ marginBottom: wt.space[8] }}>
            <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>
              Resumen · {sum.ingresosCount} ingresos · {sum.gastosCount} gastos (cálculo informativo)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: wt.space[4] }}>
              <MetricCard label="CFDIs detectados" value={String(sum.total)} helper={`${sum.confirmados} confirmados`} status={<StatusChip status="detectado" size="sm" />} />
              <MetricCard label="Requieren revisión" value={String(sum.requierenRevision)} helper="por resolver" status={<StatusChip status="requiereRevision" size="sm" />} />
              <MetricCard label="Ingresos detectados" value={liveMonth ? MXN(liveMonth.incomeDetected) : "—"} helper="estimado informativo" status={<StatusChip status="estimado" size="sm" />} />
              <MetricCard label="Retenciones" value={liveMonth ? MXN(liveMonth.retentions) : "—"} helper="pago a cuenta · por revisar" status={<StatusChip status="estimado" size="sm" />} />
              <MetricCard label="Cancelados" value={String(sum.cancelados)} helper="no cuentan" status={<StatusChip status="excluido" size="sm" />} />
              <MetricCard label="Pendientes de complemento" value={String(sum.pendientesComplemento)} helper="PPD sin REP" status={<StatusChip status="requiereRevision" size="sm" />} />
            </div>
          </section>

          {/* luk contextual (6A): señal principal sobre estos CFDIs */}
          {lukPrimary && (
            <section style={{ marginBottom: wt.space[6] }}>
              <Card variant="quiet" padding="comfortable">
                <div style={{ display: "flex", alignItems: "flex-start", gap: wt.space[3] }}>
                  <span style={{ display: "inline-flex", color: wt.color.orangeInk, marginTop: 2 }}><Sparkles size={18} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ ...wt.text.label, color: wt.color.text, margin: 0 }}>
                      luk detectó {lukSignals.length} {lukSignals.length === 1 ? "señal" : "señales"} en estos CFDIs
                    </h2>
                    <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[2]}px 0 0` }}>
                      <strong style={{ color: wt.color.text }}>{lukPrimary.title}</strong> {lukPrimaryExpl?.plainExplanation ?? lukPrimary.impact}
                    </p>
                    <div style={{ marginTop: wt.space[3] }}>
                      <button
                        type="button"
                        onClick={() => router.push("/app/luk")}
                        style={{ display: "inline-flex", alignItems: "center", gap: wt.space[2], background: "transparent", border: "none", cursor: "pointer", padding: 0, ...wt.text.label, color: wt.color.orangeInk, fontFamily: wt.font.sans }}
                      >
                        Ver en luk <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Filtros */}
          <section style={{ marginBottom: wt.space[6], display: "flex", gap: wt.space[2], flexWrap: "wrap" }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.key)}
                  style={{
                    height: 32, padding: `0 ${wt.space[4]}px`,
                    background: active ? wt.color.orange : "transparent",
                    color: active ? wt.color.textInverse : wt.color.textSecondary,
                    border: `1px solid ${active ? "transparent" : wt.color.border}`,
                    borderRadius: wt.radius.pill, fontFamily: wt.font.sans, ...wt.text.caption,
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </section>

          {hasDecisions && (
            <div style={{ marginBottom: wt.space[5] }}>
              <Alert variant="info" title="Tus decisiones de esta sesión se reflejan en tu Mes Fiscal">
                {decisionCounts.confirmed} confirmados · {decisionCounts.excluded} excluidos · {decisionCounts.review} por revisar.
                {" "}Solo excluir cambia el estimado; confirmar y revisar reordenan, no reducen impuestos.
                {source === "upload"
                  ? " Viven en esta sesión y no se guardan permanentemente."
                  : " Son locales de la demo y viven en esta sesión."}
              </Alert>
              <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", alignItems: "center", marginTop: wt.space[4] }}>
                {source === "upload" && (
                  <Button variant="primary" size="sm" onClick={() => router.push("/app/mes")}>
                    Volver al Mes Fiscal actualizado
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { clearCfdiDecisions(); setDecisions({}); }}>
                  Limpiar decisiones
                </Button>
              </div>
            </div>
          )}

          {/* Lista */}
          <section style={{ display: "grid", gap: wt.space[4], marginBottom: wt.space[8] }}>
            {visible.length > 0 ? (
              visible.map((c) => (
                <CfdiInboxItem key={c.id} cfdi={c} decision={decisions[c.id]} onDecide={(d) => onDecide(c.id, d)} synced={source === "upload"} />
              ))
            ) : (
              <Card variant="quiet" padding="comfortable">
                <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
                  No hay CFDIs en este filtro.
                </p>
              </Card>
            )}
          </section>

          {/* Trust footer */}
          <section style={{ marginBottom: wt.space[8] }}>
            <TrustPanel
              title="Vista previa local"
              description="Los CFDIs cargados en esta fase no se guardan permanentemente."
              icon={<FileText size={20} />}
              footnote={<SecurityNotice>Se procesan en este navegador; no se suben ni se guardan. Puedes borrar esta vista previa.</SecurityNotice>}
            >
              <PermissionList
                items={[
                  { allowed: true, label: "Wedge ordena tus CFDIs como decisiones para tu Mes Fiscal." },
                  { allowed: true, label: "Puedes guardar tu Mes Fiscal como resumen en tu cuenta; los XML originales no se guardan." },
                  { allowed: false, label: "No se conecta al SAT ni valida los CFDIs por ti." },
                  { allowed: false, label: "No se guardan permanentemente; tú validas y presentas en SAT." },
                ]}
              />
              <div style={{ marginTop: wt.space[5] }}>
                <Button variant="ghost" size="sm" onClick={handleClear} leftIcon={<Trash2 size={15} />}>
                  Borrar vista previa
                </Button>
              </div>
            </TrustPanel>
          </section>
        </>
      )}
    </AppShell>
  );
}
