"use client";

/**
 * /diagnostico — Diagnóstico fiscal SIN cuenta (Fase 3A).
 *
 * Valor antes de registro: 5 preguntas (sin RFC/CIEC/e.firma/teléfono/cuenta/SAT)
 * → estimación informativa (ISR/IVA, fecha límite, preparación, pendientes,
 * próxima acción) → CTA "Guardar mi mes fiscal". Reusa `lib/tax` vía estimate.ts.
 * Wedge prepara; tú validas y presentas en SAT.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { wt } from "@/design-system/tokens";
import {
  PublicShell, Button, Card, ProgressBar, Input, MetricCard, StatusChip,
  DeadlinePill, StepChecklist, ActionCard, Alert, MonthProgress,
} from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import {
  estimateDiagnostico, mxn,
  type DiagRegime, type TriState, type DiagnosticoResult,
} from "@/lib/diagnostico/estimate";
import { createDiagnosticDraft, saveDiagnosticDraft } from "@/lib/diagnostico/draft";
import { ArrowRight, ArrowLeft, Bookmark } from "lucide-react";

type MonthChoice = "actual" | "anterior" | "otro";

interface Answers {
  regime: DiagRegime | null;
  month: MonthChoice | null;
  ingreso: string;
  gastos: TriState | null;
  retenciones: TriState | null;
}

const STEPS = 5;

function periodFor(choice: MonthChoice): string {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-11
  if (choice === "anterior") { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export default function DiagnosticoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ regime: null, month: null, ingreso: "", gastos: null, retenciones: null });
  const [result, setResult] = useState<DiagnosticoResult | null>(null);

  const ingresoNum = useMemo(() => Number(a.ingreso.replace(/[^\d.]/g, "")) || 0, [a.ingreso]);

  const canContinue =
    step === 0 ? !!a.regime :
    step === 1 ? !!a.month :
    step === 2 ? ingresoNum > 0 :
    step === 3 ? !!a.gastos :
    step === 4 ? !!a.retenciones : true;

  function finish() {
    setResult(estimateDiagnostico({
      regime: a.regime ?? "unsure",
      ingreso: ingresoNum,
      gastosCFDI: a.gastos ?? "unsure",
      retenciones: a.retenciones ?? "unsure",
      period: periodFor(a.month ?? "actual"),
      now: new Date(),
    }));
  }

  function next() {
    if (step < STEPS - 1) setStep(step + 1);
    else finish();
  }

  // Guardar mi mes fiscal (Fase 4D): persiste un draft seguro en este navegador y
  // navega al signup; tras crear cuenta, /app/mes lo convierte en el primer Mes Fiscal.
  function handleSave() {
    if (result) {
      const draft = createDiagnosticDraft(result, {
        regime: a.regime ?? "unsure",
        incomeApprox: ingresoNum,
        hasCfdiExpenses: a.gastos ?? "unsure",
        hasRetentions: a.retenciones ?? "unsure",
        period: periodFor(a.month ?? "actual"),
      });
      saveDiagnosticDraft(draft);
    }
    router.push("/signup?intent=guardar-mes");
  }

  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={780}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: `${wt.space[10]}px ${wt.space[6]}px ${wt.space[16]}px`, width: "100%" }}>

        {!result ? (
          <>
            <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Diagnóstico gratis · sin cuenta</div>
            <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: `0 0 ${wt.space[3]}px` }}>Arma tu mes fiscal en 2 minutos</h1>
            <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `0 0 ${wt.space[6]}px` }}>
              Sin RFC, sin contraseña del SAT, sin tarjeta. Solo unas preguntas para estimar tu mes.
            </p>

            <div style={{ marginBottom: wt.space[7] }}>
              <ProgressBar value={((step) / STEPS) * 100} label={`Paso ${step + 1} de ${STEPS}`} showValue={false} />
            </div>

            <Card variant="default" padding="comfortable">
              {step === 0 && (
                <Question title="¿Qué régimen usas?" hint="Si no estás seguro, está bien — lo afinamos después.">
                  <OptionGroup
                    options={[
                      { value: "resico_pf", label: "RESICO PF", desc: "Tasa fija baja sobre ingresos cobrados." },
                      { value: "honorarios", label: "Honorarios / Actividad Profesional", desc: "Tarifa progresiva con deducciones." },
                      { value: "unsure", label: "No estoy seguro", desc: "Te damos una referencia y lo confirmas luego." },
                    ]}
                    selected={a.regime}
                    onSelect={(v) => setA({ ...a, regime: v as DiagRegime })}
                  />
                </Question>
              )}

              {step === 1 && (
                <Question title="¿Qué mes quieres revisar?">
                  <OptionGroup
                    options={[
                      { value: "actual", label: "Mes actual" },
                      { value: "anterior", label: "Mes anterior" },
                      { value: "otro", label: "Otro mes", desc: "Puedes ajustarlo al guardar tu mes fiscal." },
                    ]}
                    selected={a.month}
                    onSelect={(v) => setA({ ...a, month: v as MonthChoice })}
                  />
                </Question>
              )}

              {step === 2 && (
                <Question title="¿Cuánto ingresaste aproximadamente este mes?" hint="Un estimado está bien. Lo afinamos con tus CFDIs.">
                  <Input
                    label="Ingresos del mes (MXN)"
                    inputMode="numeric"
                    placeholder="30,000"
                    value={a.ingreso}
                    onChange={(e) => setA({ ...a, ingreso: e.target.value })}
                  />
                </Question>
              )}

              {step === 3 && (
                <Question title="¿Tienes gastos con CFDI?" hint="Los gastos con factura pueden bajar tu IVA y tu ISR.">
                  <OptionGroup
                    options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }, { value: "unsure", label: "No estoy seguro" }]}
                    selected={a.gastos}
                    onSelect={(v) => setA({ ...a, gastos: v as TriState })}
                  />
                </Question>
              )}

              {step === 4 && (
                <Question title="¿Te retuvieron ISR o IVA?" hint="Pasa con clientes que son personas morales.">
                  <OptionGroup
                    options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }, { value: "unsure", label: "No estoy seguro" }]}
                    selected={a.retenciones}
                    onSelect={(v) => setA({ ...a, retenciones: v as TriState })}
                  />
                </Question>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: wt.space[7] }}>
                <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} leftIcon={<ArrowLeft size={16} />}>
                  Atrás
                </Button>
                <Button variant="primary" onClick={next} disabled={!canContinue} rightIcon={<ArrowRight size={16} />}>
                  {step < STEPS - 1 ? "Continuar" : "Ver mi diagnóstico"}
                </Button>
              </div>
            </Card>

            <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[5], textAlign: "center" }}>
              No pedimos RFC, CIEC, e.firma ni cuenta. Wedge prepara información; tú validas y presentas en el SAT.
            </p>
          </>
        ) : (
          <Result result={result} ingreso={ingresoNum}
            onSave={handleSave}
            onExplore={() => router.push("/")}
            onRedo={() => { setResult(null); setStep(0); }}
          />
        )}
      </div>
    </PublicShell>
  );
}

/* ── Resultado ── */
function Result({ result, ingreso, onSave, onExplore, onRedo }: {
  result: DiagnosticoResult; ingreso: number;
  onSave: () => void; onExplore: () => void; onRedo: () => void;
}) {
  const r = result;
  return (
    <div style={{ display: "grid", gap: wt.space[5] }}>
      <div>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>{r.regimeLabel}</div>
        <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>Tu diagnóstico inicial está listo</h1>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
          Sobre ingresos de {mxn(ingreso)} · fecha límite {r.deadlineLabel}
          {r.daysToDeadline != null && r.daysToDeadline >= 0 ? ` · faltan ${r.daysToDeadline} días` : ""}.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: wt.space[4], flexWrap: "wrap" }}>
        <DeadlinePill days={r.daysToDeadline ?? 99} />
      </div>

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: wt.space[4] }}>
        <MetricCard
          label="ISR estimado del mes"
          value={r.isrEstimado != null ? mxn(r.isrEstimado) : "—"}
          helper={r.isrNota}
          status={<StatusChip status="estimado" size="sm" />}
        />
        <MetricCard
          label="IVA trasladado (por revisar)"
          value={r.ivaTrasladado != null ? mxn(r.ivaTrasladado) : "—"}
          helper={r.ivaNota}
          status={<StatusChip status="requiereRevision" size="sm" />}
        />
      </div>

      {/* Preparación + pendientes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: wt.space[4] }}>
        <Card variant="quiet"><MonthProgress month="Tu mes" percent={r.readinessPct} /></Card>
        <Card variant="quiet">
          <StepChecklist
            title="Para completar tu mes"
            steps={r.pendientes.map((p, i) => ({ label: p, state: i === 0 ? "current" : "todo" }))}
          />
        </Card>
      </div>

      {/* Próxima acción */}
      <ActionCard
        variant="recommended"
        overline={r.daysToDeadline != null && r.daysToDeadline >= 0 ? `Faltan ${r.daysToDeadline} días para el ${r.deadlineLabel}` : "Tu siguiente paso"}
        urgency={r.daysToDeadline != null && r.daysToDeadline <= 7 ? "soon" : "calm"}
        title="Guarda tu mes fiscal"
        description={r.proximaAccion}
        cta={{ label: "Guardar mi mes fiscal", onClick: onSave }}
      />

      <Alert variant="trust" title="Cómo leer esto">
        {r.disclaimer}
      </Alert>

      {/* CTAs */}
      <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[2] }}>
        <Button variant="primary" size="lg" onClick={onSave} leftIcon={<Bookmark size={18} />}>Guardar mi mes fiscal</Button>
        <Button variant="ghost" size="lg" onClick={onExplore}>Seguir explorando sin cuenta</Button>
        <Button variant="subtle" size="lg" onClick={onRedo}>Rehacer diagnóstico</Button>
      </div>
    </div>
  );
}

/* ── Helpers de formulario ── */
function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>{title}</h2>
      {hint && <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `${wt.space[2]}px 0 0` }}>{hint}</p>}
      <div style={{ marginTop: wt.space[5] }}>{children}</div>
    </div>
  );
}

function OptionGroup({ options, selected, onSelect }: {
  options: { value: string; label: string; desc?: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: wt.space[3] }}>
      {options.map((o) => {
        const active = selected === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={active}
            style={{
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: `${wt.space[4]}px ${wt.space[5]}px`,
              background: active ? wt.color.orangeMuted : wt.color.surface2,
              border: `1px solid ${active ? wt.color.orange : wt.color.border}`,
              borderRadius: wt.radius.md,
              cursor: "pointer",
              transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}`,
            }}
          >
            <span style={{ ...wt.text.label, color: active ? wt.color.orangeInk : wt.color.text }}>{o.label}</span>
            {o.desc && <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>{o.desc}</span>}
          </button>
        );
      })}
    </div>
  );
}
