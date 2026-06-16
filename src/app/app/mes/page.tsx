"use client";

/**
 * /app/mes — Mes Fiscal (Fase 4B).
 *
 * Pantalla principal interna de Wedge: el Mes Fiscal accionable ("esto está listo /
 * esto falta / esto sigue"), construido con el Design System + datos de EJEMPLO
 * (`@/lib/mes/mock`). Auth-gated por `proxy.ts` (`/app` en PROTECTED).
 *
 * Aún NO usa datos reales del usuario (sin RFC/CFDIs reales). No toca el dashboard
 * legacy (sigue vivo), ni auth, ni APIs, ni la lógica fiscal. Cero legacy: 100% DS.
 * Ancla: "Wedge prepara; tú validas y presentas en SAT." Nunca declara/paga/automatiza.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, FileText, Sparkles, ClipboardCheck, FolderArchive, Check,
} from "lucide-react";
import { wt } from "@/design-system/tokens";
import {
  AppShell, LogoLockup, Badge, MonthProgress, DeadlinePill, ActionCard,
  MetricCard, StatusChip, StepChecklist, ReviewItem, Alert, Card,
  TrustPanel, PermissionList, SecurityNotice,
} from "@/design-system";
import { AppSidebarNav } from "@/app/app/_components/AppSidebarNav";
import { AppMobileNav } from "@/app/app/_components/AppMobileNav";
import { getMockFiscalMonth, daysToDeadline } from "@/lib/mes/mock";
import { loadDiagnosticDraft, clearDiagnosticDraft, isDiagnosticDraftFresh, type DiagnosticDraft } from "@/lib/diagnostico/draft";
import { fiscalMonthFromDiagnosticDraft } from "@/lib/mes/from-diagnostic";
import { chooseMesEntryMode } from "@/lib/mes/entry-mode";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { getDemoCfdis } from "@/lib/cfdi/fixtures";
import { loadCfdiPreview, loadCfdiDecisions, clearCfdiPreview, clearCfdiDecisions } from "@/lib/cfdi/preview-store";
import { fiscalMonthFromCfdiPreviewWithDecisions } from "@/lib/cfdi/recompute";
import { summarizeCfdiDecisions, type DecisionSummary, type InboxDecision } from "@/lib/cfdi/inbox";
import type { RedactedCfdi } from "@/lib/cfdi/upload";
import { buildLukSignals, getPrimaryLukSignal } from "@/lib/luk/signals";
import { buildLukExplanation } from "@/lib/luk/explanations";
import type { LukSignal } from "@/lib/luk/types";
import type { FiscalMonth } from "@/lib/mes/types";
import {
  fiscalMonthFromSnapshot,
  type SnapshotSource,
  type DecisionsSummarySnapshot,
  type LukSignalSummarySnapshot,
  type StoredFiscalMonthSnapshot,
} from "@/lib/mes/persistence";
import { CfdiUpload } from "./CfdiUpload";
import { SaveMesPanel } from "./SaveMesPanel";

type MesMode = "demo" | "diagnostico" | "expirado" | "cfdi-demo" | "xml-preview" | "guardado";

const MXN = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

/** Color del punto por severidad de señal luk (rojo solo riesgo real; naranja solo acción). */
function lukDotColor(sev: LukSignal["severity"]): string {
  if (sev === "warning" || sev === "blocker") return wt.color.warning;
  if (sev === "review") return wt.color.trustBlueGray;
  return wt.color.textMuted;
}

/** Micro-encabezado de sección (overline sobrio). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>{children}</div>;
}

/** CTA ghost de preview. Con `disabled` se muestra como "Pronto" no accionable (honesto). */
function PreviewCta({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  if (disabled) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: wt.space[2], ...wt.text.label, color: wt.color.textMuted, opacity: 0.7 }}>
        {children} <Badge variant="outline" size="sm">Pronto</Badge>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: wt.space[2],
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
        ...wt.text.label, color: wt.color.orangeInk, fontFamily: wt.font.sans,
      }}
    >
      {children} <ArrowRight size={14} />
    </button>
  );
}

export default function MesFiscalPage() {
  const router = useRouter();
  // R7.5 (H1): el cargador de XML/ZIP se muestra en TODOS los modos (incl. diagnóstico); este helper
  // hace scroll a esa tarjeta para que "Completar con XML/ZIP" nunca caiga en /app/cfdis vacío.
  const goToUpload = () => document.getElementById("completar-xml-zip")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // El draft del diagnóstico vive en localStorage (cliente) → se lee tras montar para
  // evitar mismatch de hidratación. Sin draft = demo (mock); fresco = diagnóstico; viejo = expirado.
  const [mode, setMode] = useState<MesMode>("demo");
  const [mes, setMes] = useState(() => getMockFiscalMonth());
  // Carga real XML/ZIP (5B) + sync con Fiscal Inbox (5D): preview/decisiones solo en cliente.
  const [previewCount, setPreviewCount] = useState(0);
  const [decisionSummary, setDecisionSummary] = useState<DecisionSummary | null>(null);
  // CFDIs + decisiones del preview, para que luk (6A) muestre las MISMAS señales que /app/luk.
  const [previewCfdis, setPreviewCfdis] = useState<RedactedCfdi[]>([]);
  const [previewDecisions, setPreviewDecisions] = useState<Record<string, InboxDecision>>({});
  // R7.5: si hay snapshot guardado Y un draft de diagnóstico local, el snapshot GANA, pero
  // dejamos usar el draft de forma EXPLÍCITA (con confirmación) — nunca reemplaza en automático.
  const [pendingDraft, setPendingDraft] = useState<DiagnosticDraft | null>(null);
  const [confirmingUseDraft, setConfirmingUseDraft] = useState(false);

  useEffect(() => {
    // Prioridad de entrada (R7.5, client-only tras montar = hydration-safe). El snapshot guardado
    // en DB GANA al draft de diagnóstico local: un draft viejo NUNCA debe tapar tu Mes Fiscal
    // guardado. Orden: 1) preview XML/ZIP de esta sesión, 2) snapshot DB, 3) draft de diagnóstico
    // (solo si no hay snapshot), 4) demo.
    const preview = loadCfdiPreview();
    if (preview) {
      const decisions = loadCfdiDecisions();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMes(fiscalMonthFromCfdiPreviewWithDecisions(preview, decisions, { now: new Date() }));
      setMode("xml-preview");
      setPreviewCount(preview.cfdis.length);
      setDecisionSummary(summarizeCfdiDecisions(preview.cfdis, decisions));
      setPreviewCfdis(preview.cfdis);
      setPreviewDecisions(decisions);
      return;
    }
    // Sin preview vivo: las decisiones quedarían huérfanas (inertes) → limpieza de higiene.
    clearCfdiDecisions();
    const draft = loadDiagnosticDraft();
    let cancelled = false;
    (async () => {
      // Carga el snapshot REDACTADO guardado en la cuenta (Fase 5E); servidor + RLS son la autoridad.
      let snapshot: StoredFiscalMonthSnapshot | null = null;
      try {
        const res = await fetch("/api/mes/snapshot", { headers: { Accept: "application/json" } });
        if (res.ok && !cancelled) {
          snapshot = ((await res.json()) as { snapshot: StoredFiscalMonthSnapshot | null }).snapshot;
        }
      } catch { /* sin sesión / sin red */ }
      if (cancelled) return;
      const resolved = chooseMesEntryMode({
        hasPreview: false,
        hasSnapshot: !!snapshot,
        hasDraft: !!draft,
        draftFresh: draft ? isDiagnosticDraftFresh(draft) : false,
      });
      if (resolved === "guardado" && snapshot) {
        setMes(fiscalMonthFromSnapshot(snapshot));
        setMode("guardado");
        // El snapshot gana; si además hay draft local, se puede usar EXPLÍCITAMENTE (con confirmación).
        if (draft) setPendingDraft(draft);
      } else if ((resolved === "diagnostico" || resolved === "expirado") && draft) {
        setMes(fiscalMonthFromDiagnosticDraft(draft));
        setMode(resolved);
      }
      // resolved === "demo": se queda en el estado inicial (mock + modo demo).
    })();
    return () => { cancelled = true; };
  }, []);

  const handleNuevoDiagnostico = () => router.push("/diagnostico");
  const handleBorrarDraft = () => { clearDiagnosticDraft(); setMes(getMockFiscalMonth()); setMode("demo"); };
  // R7.5: usar EXPLÍCITAMENTE el draft de diagnóstico en vez del Mes guardado. NO borra el snapshot;
  // solo cambia la vista. Reemplazarlo de verdad requiere pulsar "Guardar" (con su confirmación).
  const adoptPendingDraft = () => {
    if (!pendingDraft) return;
    setMes(fiscalMonthFromDiagnosticDraft(pendingDraft));
    setMode(isDiagnosticDraftFresh(pendingDraft) ? "diagnostico" : "expirado");
    setPendingDraft(null);
    setConfirmingUseDraft(false);
  };
  // Descartar el draft local (no toca el snapshot guardado) para que el aviso no reaparezca.
  const discardPendingDraft = () => { clearDiagnosticDraft(); setPendingDraft(null); setConfirmingUseDraft(false); };
  // Demo local del CFDI Engine (Fase 5A): construye el Mes Fiscal desde CFDIs FICTICIOS.
  const handleUsarCfdisFicticios = () => {
    setMes(fiscalMonthFromCfdis(getDemoCfdis(), { period: "2026-06", regime: "resico_pf", now: new Date() }));
    setMode("cfdi-demo");
  };
  const handleSalirCfdiDemo = () => { setMes(getMockFiscalMonth()); setMode("demo"); };
  // Upload fresco: CfdiUpload ya guardó el preview y limpió decisiones → lo leemos del store
  // para que luk use los mismos CFDIs que /app/luk. (Aún sin decisiones → summary nulo.)
  const handleUploadPreview = (month: FiscalMonth, n: number) => {
    setMes(month);
    setPreviewCount(n);
    setDecisionSummary(null);
    setPreviewCfdis(loadCfdiPreview()?.cfdis ?? []);
    setPreviewDecisions(loadCfdiDecisions());
    setMode("xml-preview");
  };
  const handleClearUpload = () => {
    clearCfdiPreview();
    clearCfdiDecisions();
    setMes(getMockFiscalMonth());
    setPreviewCount(0);
    setDecisionSummary(null);
    setPreviewCfdis([]);
    setPreviewDecisions({});
    setMode("demo");
  };
  // Tras borrar el snapshot guardado (5E): volvemos a datos de ejemplo.
  const handleSavedDeleted = () => { setMes(getMockFiscalMonth()); setMode("demo"); };
  // R7.5: al GUARDAR un Mes que viene de un diagnóstico, limpia el draft local para que el aviso
  // "diagnóstico sin aplicar" no reaparezca (ya quedó persistido como snapshot en la cuenta).
  const handleSaved = () => { if (mode === "diagnostico" || mode === "expirado") clearDiagnosticDraft(); };

  // R8: etiquetas que distinguen claramente persistido (DB) de volátil (navegador) — no deben parecer equivalentes.
  const statusLabel = mode === "diagnostico" ? "Diagnóstico local sin guardar" : mode === "expirado" ? "Diagnóstico antiguo (sin guardar)" : mode === "cfdi-demo" ? "CFDIs ficticios" : mode === "xml-preview" ? "Vista previa local" : mode === "guardado" ? "Guardado en tu cuenta" : "Datos de ejemplo";
  const modeCaption = mode === "diagnostico" ? "diagnóstico local · sin guardar" : mode === "expirado" ? "diagnóstico antiguo · sin guardar" : mode === "cfdi-demo" ? "CFDIs ficticios (demo local)" : mode === "xml-preview" ? "vista previa local · no se guarda" : mode === "guardado" ? "guardado en tu cuenta" : "datos de ejemplo";

  const days = daysToDeadline(mes.deadline, new Date());
  const pendientes = mes.pendingActions.filter((p) => p.status !== "done");
  // R8: lo que el MONTO del mes (cobrado en MXN) NO incluye, para explicarlo y evitar sensación de
  // "ingresos faltantes" (el ICP voiceover cobra en USD; el PPD cuenta al llegar su complemento).
  const nonMxnCount = previewCfdis.filter((c) => c.currency && c.currency !== "MXN").length;
  const ppdCount = previewCfdis.filter((c) => c.paymentMethod === "PPD").length;
  const cfdiItems = mes.pendingActions.filter((p) => p.type === "revisar_cfdi" || p.type === "revisar_iva" || p.type === "validar_retencion");
  // Pasos "listos" reales = los pasos en estado "done" del checklist de cada modo (honesto,
  // no inflar el avance): demo muestra 2 done; diagnóstico/expirado/cfdi-demo/xml-preview muestran 1.
  const readyCount = mode === "demo" ? 2 : 1;
  // Footnote honesto. El snapshot guardado (5E) es un resumen REDACTADO; los XML nunca se suben.
  const trustFootnote =
    mode === "guardado"
      ? "Guardamos un resumen redactado de tu Mes Fiscal en tu cuenta; no tus XML."
      : mode === "xml-preview"
      ? "Tus archivos se procesan en este navegador; no se suben ni se guardan en esta fase."
      : "Tú decides qué traer y cuándo conectar SAT.";

  // luk contextual (Fase 6A): mismas señales que /app/luk → en xml-preview pasamos los CFDIs
  // y decisiones (señales ricas); en otros modos, solo el FiscalMonth.
  const lukSignals = buildLukSignals(
    mode === "xml-preview"
      ? { month: mes, cfdis: previewCfdis, decisions: previewDecisions, now: new Date() }
      : { month: mes, now: new Date() },
  );
  const lukPrimary = getPrimaryLukSignal(lukSignals);
  const lukPrimaryExpl = lukPrimary ? buildLukExplanation(lukPrimary) : null;

  // Persistencia segura (Fase 5E): origen, si tiene sentido guardar, y resúmenes redactados.
  const snapshotSource: SnapshotSource =
    mode === "xml-preview" ? "xml_preview" : mode === "diagnostico" || mode === "expirado" ? "diagnostic" : "demo";
  // T8 (R7.1): NO se permite guardar en modo demo/cfdi-demo (CFDIs ficticios) para no
  // persistir datos de ejemplo como reales. Solo XML/ZIP real (preview) o diagnóstico.
  const canSaveMes = mode === "xml-preview" || mode === "diagnostico";
  const decisionsForSnapshot: DecisionsSummarySnapshot | undefined = decisionSummary
    ? { confirmed: decisionSummary.confirmed, excluded: decisionSummary.excluded, review: decisionSummary.review }
    : undefined;
  const lukWarn = lukSignals.filter((s) => s.severity === "warning" || s.severity === "blocker").length;
  const lukRev = lukSignals.filter((s) => s.severity === "review").length;
  const lukSummaryForSnapshot: LukSignalSummarySnapshot = {
    total: lukSignals.length,
    warning: lukWarn,
    review: lukRev,
    info: lukSignals.length - lukWarn - lukRev,
  };

  return (
    <AppShell
      className="mes-shell"
      maxWidth={920}
      sidebar={<AppSidebarNav />}
      topbar={
        <div style={{ maxWidth: 920, margin: "0 auto", padding: `${wt.space[4]}px ${wt.space[6]}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[4], minWidth: 0 }}>
            <span className="mes-topbar-logo" style={{ display: "none" }}><LogoLockup variant="iconOnly" tone="dark" size="sm" /></span>
            <span style={{ ...wt.text.label, color: wt.color.text }}>Mes Fiscal · {mes.monthLabel}</span>
            <Badge variant={mode === "guardado" ? "info" : mode === "expirado" ? "warning" : mode === "demo" ? "neutral" : "outline"}>{statusLabel}</Badge>
          </div>
          <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>{mes.regimeLabel} · {modeCaption}</span>
        </div>
      }
    >
      <style>{`
        @media (max-width: 860px) {
          .mes-shell { grid-template-columns: 1fr !important; }
          .mes-shell > aside { display: none !important; }
          .mes-topbar-logo { display: inline-flex !important; }
        }
      `}</style>

      {/* Banner honesto según el origen del Mes Fiscal */}
      {mode === "diagnostico" && (
        <div style={{ marginBottom: wt.space[6] }}>
          <Alert variant="trust" title="Tu Mes Fiscal empezó con tu diagnóstico">
            Creamos este Mes Fiscal con tu diagnóstico inicial (guardado en este navegador). Para hacerlo
            más preciso, completa tus CFDIs con XML/ZIP o conexión SAT más adelante. Wedge prepara; tú validas en SAT.
          </Alert>
          <div style={{ display: "flex", gap: wt.space[5], flexWrap: "wrap", alignItems: "center", marginTop: wt.space[4] }}>
            <PreviewCta onClick={goToUpload}>Completar con XML/ZIP</PreviewCta>
            <PreviewCta onClick={handleNuevoDiagnostico}>Hacer nuevo diagnóstico</PreviewCta>
            <PreviewCta onClick={handleBorrarDraft}>Borrar diagnóstico local</PreviewCta>
          </div>
        </div>
      )}
      {mode === "demo" && (
        <div style={{ marginBottom: wt.space[6] }}>
          <Alert variant="info" title="Estás viendo datos de ejemplo">
            Haz un diagnóstico o sube XML/ZIP más adelante para crear tu Mes Fiscal real. Wedge prepara; tú validas en SAT.
          </Alert>
          <div style={{ marginTop: wt.space[4] }}>
            <PreviewCta onClick={handleNuevoDiagnostico}>Hacer diagnóstico gratis</PreviewCta>
          </div>
        </div>
      )}
      {mode === "expirado" && (
        <div style={{ marginBottom: wt.space[6] }}>
          <Alert variant="warning" title="Encontramos un diagnóstico antiguo">
            Este diagnóstico tiene más de 30 días. Puedes retomarlo o empezar uno nuevo. Wedge prepara; tú validas en SAT.
          </Alert>
          <div style={{ display: "flex", gap: wt.space[5], flexWrap: "wrap", marginTop: wt.space[4] }}>
            <PreviewCta onClick={handleNuevoDiagnostico}>Hacer nuevo diagnóstico</PreviewCta>
            <PreviewCta onClick={handleBorrarDraft}>Borrar diagnóstico local</PreviewCta>
          </div>
        </div>
      )}

      {/* Banner del preview de carga real XML/ZIP (5B) + sync con Fiscal Inbox (5D) */}
      {mode === "xml-preview" && (() => {
        const hasDecisions = !!decisionSummary && (decisionSummary.confirmed + decisionSummary.excluded + decisionSummary.review) > 0;
        return (
          <div style={{ marginBottom: wt.space[6] }}>
            {hasDecisions ? (
              <Alert variant="info" title="Este Mes Fiscal incluye cambios temporales desde tu Fiscal Inbox">
                {decisionSummary!.confirmed} CFDIs confirmados · {decisionSummary!.excluded} excluido(s) · {decisionSummary!.review} por revisar.
                Estos cambios viven en este navegador y no se guardan permanentemente. Wedge prepara; tú validas en SAT.
              </Alert>
            ) : (
              <Alert variant="trust" title="Tu Mes Fiscal se creó con XML/ZIP cargados en este navegador">
                Procesamos los CFDIs que subiste en este navegador para esta vista previa. No se conecta al SAT
                y no se guarda permanentemente en esta fase. Wedge prepara; tú validas en SAT.
              </Alert>
            )}
            <div style={{ display: "flex", gap: wt.space[5], flexWrap: "wrap", alignItems: "center", marginTop: wt.space[4] }}>
              <PreviewCta onClick={() => router.push("/app/cfdis")}>Seguir revisando CFDIs</PreviewCta>
              <PreviewCta onClick={handleClearUpload}>Borrar preview y decisiones</PreviewCta>
            </div>
          </div>
        );
      })()}

      {/* Banner: el Mes Fiscal se cargó desde el snapshot REDACTADO guardado en la cuenta (5E) */}
      {mode === "guardado" && (
        <div style={{ marginBottom: wt.space[6] }}>
          <Alert variant="trust" title="Este Mes Fiscal está guardado en tu cuenta">
            Cargamos el resumen redactado que guardaste. No guardamos tus XML; vuelve a subirlos si quieres
            recalcular al detalle. Puedes borrar este avance cuando quieras. Wedge prepara; tú validas en SAT.
          </Alert>
          {/* R7.5: hay un diagnóstico local SIN aplicar. Tu Mes guardado sigue intacto; usar el
              diagnóstico es una decisión EXPLÍCITA con confirmación (nunca reemplaza en automático). */}
          {pendingDraft && (
            <div style={{ marginTop: wt.space[4] }}>
              {confirmingUseDraft ? (
                <Alert variant="warning" title="Ya tienes un Mes Fiscal guardado">
                  Si usas este diagnóstico, reemplazará tu avance guardado cuando lo guardes. Tu Mes
                  Fiscal actual no se toca hasta que tú guardes.
                  <div style={{ display: "flex", gap: wt.space[5], flexWrap: "wrap", alignItems: "center", marginTop: wt.space[4] }}>
                    <PreviewCta onClick={adoptPendingDraft}>Reemplazar con este diagnóstico</PreviewCta>
                    <PreviewCta onClick={() => setConfirmingUseDraft(false)}>Cancelar y volver a mi Mes Fiscal</PreviewCta>
                  </div>
                </Alert>
              ) : (
                <div style={{ display: "flex", gap: wt.space[5], flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>Tienes un diagnóstico reciente sin aplicar.</span>
                  <PreviewCta onClick={() => setConfirmingUseDraft(true)}>Usar este diagnóstico</PreviewCta>
                  <PreviewCta onClick={discardPendingDraft}>Descartar diagnóstico local</PreviewCta>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CFDI Engine — carga real XML/ZIP (5B) + demo ficticios (5A). En "guardado" también, para
          poder RECALCULAR subiendo de nuevo los XML (el snapshot no guarda los archivos). */}
      {(mode === "demo" || mode === "cfdi-demo" || mode === "xml-preview" || mode === "guardado" || mode === "diagnostico" || mode === "expirado") && (
        <section id="completar-xml-zip" style={{ marginBottom: wt.space[6] }}>
          <Card variant="quiet" padding="comfortable">
            <div style={{ display: "flex", alignItems: "flex-start", gap: wt.space[3], marginBottom: wt.space[5] }}>
              <span style={{ display: "inline-flex", color: wt.color.trustBlueGray, marginTop: 2 }}><FileText size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>Completar con XML/ZIP</h2>
                <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[2]}px 0 0` }}>
                  Lee tus CFDIs (XML o ZIP) para armar una vista previa de tu Mes Fiscal — una alternativa
                  segura a conectar SAT. También puedes probar con datos ficticios.
                </p>
              </div>
            </div>

            {mode === "xml-preview" ? (
              <CfdiUpload active count={previewCount} onPreview={handleUploadPreview} onClear={handleClearUpload} />
            ) : mode === "cfdi-demo" ? (
              <div style={{ display: "flex", gap: wt.space[5], flexWrap: "wrap", alignItems: "center" }}>
                <Badge variant="info" size="sm">Estás viendo CFDIs ficticios</Badge>
                <PreviewCta onClick={handleSalirCfdiDemo}>Volver a datos de ejemplo</PreviewCta>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: wt.space[5] }}>
                <CfdiUpload active={false} count={0} onPreview={handleUploadPreview} onClear={handleClearUpload} />
                <div style={{ borderTop: `1px solid ${wt.color.border}`, paddingTop: wt.space[4], display: "flex", gap: wt.space[4], flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>¿Sin XML a la mano?</span>
                  <PreviewCta onClick={handleUsarCfdisFicticios}>Probar con CFDIs ficticios</PreviewCta>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* 1+2. Header + Hero */}
      <section style={{ display: "flex", flexDirection: "column", gap: wt.space[5], marginBottom: wt.space[9] }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
          <div>
            <SectionLabel>Tu mes fiscal · {mes.regimeLabel}</SectionLabel>
            <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>{mes.monthLabel}</h1>
            <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
              Wedge prepara; tú validas y presentas en SAT.
            </p>
          </div>
          <DeadlinePill days={days} />
        </div>
        <MonthProgress month={mes.monthLabel} percent={mes.progress} ready={readyCount} pending={pendientes.length} next={mes.nextBestAction ? 1 : 0} />
        <p style={{ ...wt.text.body, color: wt.color.textSecondary, margin: 0 }}>
          {mes.progress}% listo · <strong style={{ color: wt.color.text }}>Faltan {pendientes.length} acciones</strong> antes del día 17.
        </p>
      </section>

      {/* 3. Próxima mejor acción */}
      {mes.nextBestAction && (
        <section style={{ marginBottom: wt.space[9] }}>
          <SectionLabel>Esto sigue</SectionLabel>
          <ActionCard
            variant="recommended"
            overline={`Siguiente acción · faltan ${days} días para el día 17`}
            urgency={days <= 7 ? "soon" : "calm"}
            title={mes.nextBestAction.title}
            description={`${mes.nextBestAction.description} · ${mes.nextBestAction.impact} · ${mes.nextBestAction.estimatedTime}`}
            cta={{ label: mes.nextBestAction.actionLabel, onClick: goToUpload }}
          />
        </section>
      )}

      {/* 4. Métricas fiscales */}
      <section style={{ marginBottom: wt.space[9] }}>
        <SectionLabel>Tu mes en números (cálculo informativo)</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: wt.space[4] }}>
          <MetricCard label="ISR estimado" value={MXN(mes.isrEstimate)} helper="RESICO PF · Art. 113-E" status={<StatusChip status="estimado" size="sm" />} />
          <MetricCard label="IVA estimado" value={MXN(mes.ivaEstimate)} helper="por revisar" status={<StatusChip status="requiereRevision" size="sm" />} />
          <MetricCard label="Ingresos detectados" value={MXN(mes.incomeDetected)} helper={mes.incomeConfirmed > 0 ? `${MXN(mes.incomeConfirmed)} confirmados por ti` : "cobrado · aún sin confirmar por ti"} status={<StatusChip status={mes.incomeConfirmed > 0 ? "confirmado" : "detectado"} size="sm" />} />
          <MetricCard label="Retenciones" value={MXN(mes.retentions)} helper="pago a cuenta · por revisar" status={<StatusChip status="estimado" size="sm" />} />
          <MetricCard label="Pendientes" value={String(pendientes.length)} helper="acciones por resolver" status={<StatusChip status="requiereRevision" size="sm" />} />
        </div>
        {(nonMxnCount > 0 || ppdCount > 0) && (
          <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
            El monto del mes es lo cobrado en MXN.
            {nonMxnCount > 0 ? ` No incluye ${nonMxnCount} CFDI${nonMxnCount > 1 ? "s" : ""} en otra moneda (falta tipo de cambio).` : ""}
            {ppdCount > 0 ? " Los pagos en parcialidades (PPD) suman cuando llega su complemento." : ""}
          </p>
        )}
      </section>

      {/* 5. Checklist del Mes Fiscal */}
      <section style={{ marginBottom: wt.space[9] }}>
        <SectionLabel>Tu mes, paso a paso</SectionLabel>
        <Card variant="quiet" padding="comfortable">
          <StepChecklist
            steps={mode === "demo" ? [
              { label: "Diagnóstico guardado", state: "done" },
              { label: "CFDIs detectados", state: "done" },
              { label: "Ingresos por confirmar", state: "current" },
              { label: "IVA en revisión", state: "todo" },
              { label: "Listo para validar en SAT", state: "todo" },
              { label: "Acuse pendiente", state: "todo" },
            ] : mode === "cfdi-demo" ? [
              { label: "CFDIs importados (ficticios)", state: "done" },
              { label: "Ingresos por confirmar", state: "current" },
              { label: "Revisar IVA acreditable", state: "todo" },
              { label: "Validar retenciones", state: "todo" },
              { label: "Listo para validar en SAT", state: "todo" },
              { label: "Marcar como presentado", state: "todo" },
            ] : mode === "xml-preview" ? [
              { label: "CFDIs leídos (XML/ZIP)", state: "done" },
              { label: "Ingresos por confirmar", state: "current" },
              { label: "Revisar IVA acreditable", state: "todo" },
              { label: "Validar retenciones", state: "todo" },
              { label: "Listo para validar en SAT", state: "todo" },
              { label: "Marcar como presentado", state: "todo" },
            ] : [
              { label: "Diagnóstico guardado", state: "done" },
              { label: "Traer tus CFDIs (XML/ZIP o SAT)", state: "current" },
              { label: "Confirmar ingresos cobrados", state: "todo" },
              { label: "Revisar IVA acreditable", state: "todo" },
              { label: "Listo para validar en SAT", state: "todo" },
              { label: "Marcar como presentado", state: "todo" },
            ]}
          />
        </Card>
      </section>

      {/* 6. CFDIs por revisar */}
      {cfdiItems.length > 0 && (
      <section style={{ marginBottom: wt.space[9] }}>
        <SectionLabel>Esto falta · por revisar</SectionLabel>
        <div style={{ display: "grid", gap: wt.space[4] }}>
          {cfdiItems.map((p) => (
            <ReviewItem
              key={p.id}
              title={p.title}
              meta={`${p.estimatedTime} · riesgo ${p.risk}`}
              impact={p.description}
              status={<StatusChip status="requiereRevision" size="sm" />}
              detail={<span>Impacto: {p.impact}. Wedge lo prepara; tú confirmas y validas en SAT.</span>}
              primaryAction={{ label: p.actionLabel, onClick: () => router.push("/app/cfdis") }}
            />
          ))}
        </div>
      </section>
      )}

      {/* 7. luk contextual — señales (no chat) */}
      <section style={{ marginBottom: wt.space[9] }}>
        <SectionLabel>Tu copiloto fiscal</SectionLabel>
        <Card variant="default" padding="comfortable">
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], marginBottom: wt.space[4] }}>
            <span style={{ display: "inline-flex", color: wt.color.orangeInk }}><Sparkles size={18} /></span>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>
              {lukSignals.length > 0
                ? `luk detectó ${lukSignals.length} ${lukSignals.length === 1 ? "señal" : "señales"} este mes`
                : "luk aún no tiene señales"}
            </h2>
          </div>

          {lukPrimary ? (
            <>
              <div style={{ background: wt.color.surface2, border: `1px solid ${wt.color.border}`, borderRadius: wt.radius.md, padding: wt.space[4] }}>
                <div style={{ display: "flex", alignItems: "center", gap: wt.space[2], marginBottom: wt.space[2] }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: lukDotColor(lukPrimary.severity), flexShrink: 0 }} />
                  <strong style={{ ...wt.text.label, color: wt.color.text }}>{lukPrimary.title}</strong>
                </div>
                {/* Explicación de 1 línea (qué significa); el detalle completo vive en /app/luk. */}
                <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
                  {lukPrimaryExpl?.plainExplanation ?? lukPrimary.impact}
                </p>
              </div>
              <div style={{ marginTop: wt.space[5] }}>
                <PreviewCta onClick={() => router.push("/app/luk")}>Ver explicación en luk</PreviewCta>
              </div>
            </>
          ) : (
            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
              luk necesita un diagnóstico o XML/ZIP para detectar señales.
            </p>
          )}

          <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: `${wt.space[4]}px 0 0` }}>
            luk no presenta declaraciones. Te ayuda a saber qué revisar.
          </p>
        </Card>
      </section>

      {/* 8+9. Guía SAT + Evidencia (previews) */}
      <section style={{ marginBottom: wt.space[9], display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: wt.space[5] }}>
        <Card variant="quiet" padding="comfortable">
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], marginBottom: wt.space[4] }}>
            <span style={{ display: "inline-flex", color: wt.color.trustBlueGray }}><ClipboardCheck size={18} /></span>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>Guía SAT</h2>
          </div>
          <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `0 0 ${wt.space[4]}px` }}>
            Antes de entrar al SAT, revisa estos puntos:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: wt.space[3] }}>
            {["Ingresos confirmados", "IVA revisado", "Retenciones revisadas", "CFDIs revisados"].map((x) => (
              <li key={x} style={{ display: "flex", alignItems: "center", gap: wt.space[3], ...wt.text.bodySm, color: wt.color.textSecondary }}>
                <span aria-hidden style={{ display: "inline-flex", color: wt.color.textMuted }}><Check size={14} strokeWidth={2.25} /></span>{x}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: wt.space[5] }}><PreviewCta disabled>Ver guía SAT</PreviewCta></div>
        </Card>

        <Card variant="quiet" padding="comfortable">
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], marginBottom: wt.space[4] }}>
            <span style={{ display: "inline-flex", color: wt.color.trustBlueGray }}><FolderArchive size={18} /></span>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>Evidencia del mes</h2>
          </div>
          {mode === "guardado" ? (
            // En "guardado" NO persistimos XML — ser honestos en vez de mostrar "XML · parcial".
            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
              No guardamos tus XML en tu cuenta, solo el resumen redactado. Vuelve a subir tus CFDIs
              (XML/ZIP) arriba para recalcular y ver la evidencia del mes.
            </p>
          ) : (
            <>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: wt.space[3] }}>
                {[["XML de tus CFDIs", "parcial"], ["Notas del mes", "vacío"], ["Acuse del SAT", "pendiente"], ["Export para tu contador", "próximamente"]].map(([k, v]) => (
                  <li key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[3], ...wt.text.bodySm, color: wt.color.textSecondary }}>
                    <span>{k}</span><Badge variant="outline" size="sm">{v}</Badge>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: wt.space[5] }}><PreviewCta disabled>Ver evidencia</PreviewCta></div>
            </>
          )}
        </Card>
      </section>

      {/* 10. History preview */}
      <section style={{ marginBottom: wt.space[9] }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: wt.space[3] }}>
          <SectionLabel>Historial</SectionLabel>
          {mode === "demo" && <Badge variant="outline" size="sm">Ejemplo</Badge>}
        </div>
        <Card variant="quiet" padding="comfortable">
          {mes.historyPreview.length > 0 ? (
            <>
              <div style={{ display: "grid", gap: wt.space[3] }}>
                {mes.historyPreview.map((h) => (
                  <div key={h.monthLabel} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[3] }}>
                    <span style={{ ...wt.text.body, color: wt.color.text }}>{h.monthLabel}</span>
                    {h.status === "marcado_presentado"
                      ? <Badge variant="success">Marcado como presentado</Badge>
                      : <Badge variant="warning">En revisión</Badge>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: wt.space[5] }}><PreviewCta disabled>Ver historial</PreviewCta></div>
            </>
          ) : (
            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
              Aún no tienes meses previos. Este es tu primer Mes Fiscal — cuando cierres un mes, aparecerá aquí.
            </p>
          )}
        </Card>
      </section>

      {/* 10b. Guardar el Mes Fiscal en la cuenta (Fase 5E) — snapshot redactado + consentimiento */}
      <section style={{ marginBottom: wt.space[9] }}>
        <SectionLabel>Guardar tu avance</SectionLabel>
        <SaveMesPanel
          month={mes}
          currentMonthLabel={mes.monthLabel}
          savedView={mode === "guardado"}
          canSave={canSaveMes}
          source={snapshotSource}
          decisions={decisionsForSnapshot}
          luk={lukSummaryForSnapshot}
          onDeleted={handleSavedDeleted}
          onSaved={handleSaved}
        />
      </section>

      {/* 11. Trust / seguridad */}
      <section style={{ marginBottom: wt.space[8] }}>
        <TrustPanel
          title="Wedge prepara; tú validas en SAT."
          description={`${mes.cfdisIssued} CFDIs emitidos · ${mes.cfdisReceived} recibidos este mes.`}
          icon={<FileText size={20} />}
          footnote={<SecurityNotice>{trustFootnote}</SecurityNotice>}
        >
          <PermissionList
            items={[
              { allowed: true, label: "Puedes traer tus CFDIs con XML/ZIP o conexión SAT." },
              { allowed: true, label: "Wedge calcula tu ISR/IVA como cálculo informativo." },
              { allowed: false, label: "Wedge no declara, no paga ni modifica información en SAT." },
            ]}
          />
        </TrustPanel>
      </section>

      <AppMobileNav />
    </AppShell>
  );
}
