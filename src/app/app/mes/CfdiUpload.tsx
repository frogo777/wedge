"use client";

/**
 * CfdiUpload — carga consentida de XML/ZIP (Fase 5B), client-only.
 *
 * El usuario da consentimiento explícito, selecciona .xml/.zip y Wedge los procesa EN ESTE
 * NAVEGADOR (sin red, sin persistencia) para producir un preview del Mes Fiscal.
 * No conecta SAT, no pide e.firma/CIEC, no guarda nada permanentemente. "Wedge prepara; tú
 * validas en SAT."
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { Button, Checkbox, PermissionList, SecurityNotice, Alert, Badge } from "@/design-system";
import { buildPreviewFromUploadedCfdis, type UploadIssue } from "@/lib/cfdi/upload";
import { saveCfdiPreview, clearCfdiPreview, clearCfdiDecisions, redactPreviewForStorage, PREVIEW_VERSION } from "@/lib/cfdi/preview-store";
import type { FiscalMonth } from "@/lib/mes/types";

type UploadStatus = "idle" | "selected" | "parsing" | "error";

export function CfdiUpload({
  active,
  count,
  onPreview,
  onClear,
}: {
  /** true cuando ya hay un preview de XML/ZIP activo en /app/mes. */
  active: boolean;
  /** # de CFDIs del preview activo (para el resumen). */
  count: number;
  onPreview: (month: FiscalMonth, count: number) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [issues, setIssues] = useState<UploadIssue[]>([]);

  const resetInput = () => {
    setFiles([]);
    setIssues([]);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
    setIssues([]);
    setStatus(list.length ? "selected" : "idle");
  };

  const onProcess = async () => {
    if (!consent || files.length === 0 || status === "parsing") return;
    setStatus("parsing");
    setIssues([]);
    try {
      // Procesamiento LOCAL (sin red, sin persistencia). RESICO PF por defecto en el preview.
      const res = await buildPreviewFromUploadedCfdis(files, { regime: "resico_pf", now: new Date() });
      if (res.ok && res.month) {
        const notices: UploadIssue[] = [...res.issues];
        if (res.periodsDetected.length > 1) {
          const dropped = res.totalParsed - res.count;
          notices.push({
            file: "(varios meses)",
            code: "multi_month",
            message: `Detectamos CFDIs de varios meses. La vista previa es de ${res.month.monthLabel}${dropped > 0 ? `; ${dropped} de otros meses no se incluyen` : ""}.`,
          });
        }
        // Carga fresca → descarta decisiones temporales de un preview anterior (evita aplicarlas
        // a CFDIs distintos), y guarda el preview REDACTADO en sessionStorage (sin red, sin DB).
        clearCfdiDecisions();
        const m = res.month;
        saveCfdiPreview({
          version: PREVIEW_VERSION,
          savedAt: new Date().toISOString(),
          period: m.year && m.month ? `${m.year}-${String(m.month).padStart(2, "0")}` : "",
          monthLabel: m.monthLabel,
          regimeLabel: m.regimeLabel,
          source: "upload",
          cfdis: redactPreviewForStorage(res.cfdis),
          summary: { incomeDetected: m.incomeDetected, isrEstimate: m.isrEstimate, ivaEstimate: m.ivaEstimate, retentions: m.retentions },
        });
        setIssues(notices);
        onPreview(res.month, res.count);
        setStatus("idle");
      } else {
        setIssues(
          res.issues.length
            ? res.issues
            : [{ file: "(selección)", code: "invalid_cfdi", message: "No encontramos CFDIs válidos en lo que subiste." }],
        );
        setStatus("error");
      }
    } catch {
      setIssues([{ file: "(proceso)", code: "read_error", message: "No pudimos procesar los archivos." }]);
      setStatus("error");
    }
  };

  const onClearPreview = () => {
    clearCfdiPreview();
    resetInput();
    setConsent(false);
    onClear();
  };

  // ── Preview activo: resumen + borrar ──────────────────────────────────
  if (active) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: wt.space[4] }}>
        <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", alignItems: "center" }}>
          <Badge variant="info" size="sm">Vista previa de XML/ZIP</Badge>
          <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>
            {count} {count === 1 ? "CFDI leído" : "CFDIs leídos"} en este navegador · no se guardó nada.
          </span>
        </div>
        {issues.length > 0 && <IssueList issues={issues} variant="warning" />}
        <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary" size="sm" onClick={() => router.push("/app/cfdis")} rightIcon={<ArrowRight size={15} />}>
            Revisar CFDIs
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearPreview} leftIcon={<Trash2 size={15} />}>
            Borrar vista previa
          </Button>
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>
          Vista previa · estimado informativo. No se conecta al SAT. Wedge prepara; tú validas en SAT.
        </p>
      </div>
    );
  }

  // ── Flujo de carga: consentimiento → selección → procesar ─────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: wt.space[5] }}>
      <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
        Puedes usar XML/ZIP sin conectar SAT. Wedge leerá los CFDIs seleccionados para armar una
        vista previa de tu Mes Fiscal. Todo ocurre en este navegador; los archivos no se suben ni se guardan.
      </p>

      <PermissionList
        items={[
          { allowed: true, label: "Wedge lee los CFDIs que selecciones para armar una vista previa." },
          { allowed: true, label: "Todo ocurre en este navegador; los archivos no se suben ni se guardan." },
          { allowed: false, label: "No se conecta al SAT ni pide tu e.firma o CIEC." },
          { allowed: false, label: "No declara ni paga; tú validas y presentas en SAT." },
        ]}
      />

      <Checkbox
        label="Entiendo que Wedge leerá estos CFDIs en este navegador para una vista previa y no los guarda permanentemente."
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
      />

      <input
        ref={inputRef}
        type="file"
        accept=".xml,.zip,application/xml,text/xml,application/zip,application/x-zip-compressed"
        multiple
        onChange={onPick}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} leftIcon={<Upload size={15} />}>
          Seleccionar XML/ZIP
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onProcess}
          disabled={!consent || files.length === 0}
          loading={status === "parsing"}
        >
          Procesar XML/ZIP
        </Button>
        {files.length > 0 && (
          <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>
            {files.length} {files.length === 1 ? "archivo seleccionado" : "archivos seleccionados"}
          </span>
        )}
      </div>

      {!consent && files.length > 0 && (
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>
          Marca la casilla de consentimiento para procesar.
        </p>
      )}

      {status === "error" && issues.length > 0 && <IssueList issues={issues} variant="danger" />}

      <SecurityNotice>
        Todo ocurre en este navegador: los archivos no se suben ni se guardan. Puedes borrar la vista previa cuando quieras.
      </SecurityNotice>
    </div>
  );
}

function IssueList({ issues, variant }: { issues: UploadIssue[]; variant: "warning" | "danger" }) {
  return (
    <Alert variant={variant} title={variant === "danger" ? "No pudimos usar algunos archivos" : "Algunos CFDIs requieren revisión"}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: wt.space[2] }}>
        {issues.slice(0, 8).map((it, i) => (
          <li key={`${it.code}-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: wt.space[2], ...wt.text.bodySm }}>
            <span aria-hidden style={{ display: "inline-flex", marginTop: 2 }}><AlertTriangle size={13} /></span>
            <span><strong style={{ fontWeight: 600 }}>{it.file}</strong> — {it.message}</span>
          </li>
        ))}
        {issues.length > 8 && <li style={{ ...wt.text.caption, color: wt.color.textMuted }}>…y {issues.length - 8} más.</li>}
      </ul>
    </Alert>
  );
}
