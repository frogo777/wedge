"use client";

/**
 * SaveMesPanel — persistencia segura del Mes Fiscal en la cuenta (Fase 5E).
 *
 * Guardar = un resumen REDACTADO (no XML, no RFC/UUID completos, no datos SAT) vía
 * `/api/mes/snapshot` (auth + CSRF + RLS owner-only). Consentimiento EXPLÍCITO antes de
 * guardar; el usuario puede borrar su avance. No auto-guarda. Copy: "Wedge prepara; tú
 * validas en SAT". No promete cifrado ni seguridad absoluta.
 */

import { useEffect, useState } from "react";
import { Save, Trash2, ShieldCheck } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { Card, Button, ConsentPanel, Badge } from "@/design-system";
import type { FiscalMonth } from "@/lib/mes/types";
import type {
  SnapshotSource,
  DecisionsSummarySnapshot,
  LukSignalSummarySnapshot,
} from "@/lib/mes/persistence";

interface SavedState {
  id: string;
  updatedAt: string;
  monthLabel: string;
}

export interface SaveMesPanelProps {
  month: FiscalMonth;
  /** Etiqueta del mes en pantalla, para avisar si lo guardado es de otro periodo. */
  currentMonthLabel: string;
  /** true si el Mes mostrado proviene de un snapshot guardado (modo "guardado"). */
  savedView: boolean;
  /** true si hay un Mes Fiscal real que tiene sentido guardar (no demo/expirado). */
  canSave: boolean;
  source: SnapshotSource;
  decisions?: DecisionsSummarySnapshot;
  luk?: LukSignalSummarySnapshot;
  onDeleted?: () => void;
  /** Se invoca tras un guardado exitoso (para que el padre limpie estado local, p.ej. el draft). */
  onSaved?: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export function SaveMesPanel({
  month, currentMonthLabel, savedView, canSave, source, decisions, luk, onDeleted, onSaved,
}: SaveMesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingUpdate, setConfirmingUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/mes/snapshot", { headers: { Accept: "application/json" } });
      if (!res.ok) { setSaved(null); return; }
      const data = (await res.json()) as { snapshot: { id: string; updated_at: string; month_label: string } | null };
      setSaved(data.snapshot ? { id: data.snapshot.id, updatedAt: data.snapshot.updated_at, monthLabel: data.snapshot.month_label } : null);
    } catch {
      setSaved(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function doSave() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mes/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, source, decisions, luk }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        setError(
          data.error === "unsafe_payload"
            ? "Por seguridad no guardamos datos sensibles, así que no se guardó nada. Intenta de nuevo."
            : data.message || "No se pudo guardar. Intenta de nuevo.",
        );
        return;
      }
      setShowConsent(false);
      setConfirmingUpdate(false);
      await refresh();
      onSaved?.(); // R7.5: el padre limpia el draft local si lo guardado venía de un diagnóstico.
    } catch {
      setError("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!saved) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mes/snapshot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saved.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message || "No se pudo borrar. Intenta de nuevo.");
        return;
      }
      setSaved(null);
      setConfirmingDelete(false);
      onDeleted?.();
    } catch {
      setError("No se pudo borrar. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  // Panel de consentimiento (antes de guardar por primera vez).
  if (showConsent) {
    return (
      <ConsentPanel
        title="Guardar tu Mes Fiscal en tu cuenta"
        description="Se guardará un resumen redactado de tu Mes Fiscal para que puedas continuar después, aunque cierres esta pestaña."
        permissions={[
          { allowed: true, label: "Guardamos un resumen: tu avance, montos estimados y pendientes." },
          { allowed: false, label: "No guardamos tus XML, ni tu RFC/UUID completos, ni datos del SAT." },
          { allowed: true, label: "Puedes borrar este avance cuando quieras." },
          { allowed: false, label: "Wedge no declara ni paga; tú validas en SAT." },
        ]}
        onConsent={{ label: busy ? "Guardando…" : "Guardar en mi cuenta", onClick: busy ? () => {} : doSave }}
        manualAlt={{ label: "Cancelar", onClick: () => { setShowConsent(false); setError(null); } }}
        securityNote="No se conecta al SAT. Guardamos solo lo necesario para que continúes; no es un respaldo de tus archivos."
      />
    );
  }

  return (
    <Card variant="quiet" padding="comfortable">
      <div style={{ display: "flex", alignItems: "flex-start", gap: wt.space[3], marginBottom: wt.space[4] }}>
        <span style={{ display: "inline-flex", color: wt.color.trustBlueGray, marginTop: 2 }}><ShieldCheck size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], flexWrap: "wrap" }}>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>Tu Mes Fiscal en tu cuenta</h2>
            {/* Estado de PERSISTENCIA (info), no un hito fiscal — el verde/success se reserva para "presentado". */}
            {saved && <Badge variant="info" size="sm">Guardado en tu cuenta</Badge>}
          </div>
          <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[2]}px 0 0` }}>
            {saved
              ? <>Guardamos un <strong>resumen redactado</strong> de tu Mes Fiscal — no tus XML. Puedes borrarlo cuando quieras.</>
              : <>Guarda un <strong>resumen redactado</strong> (tu avance y montos estimados) para continuar después. No guardamos tus XML.</>}
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>Revisando tu cuenta…</p>
      ) : saved ? (
        <div style={{ display: "flex", flexDirection: "column", gap: wt.space[4] }}>
          <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
            {saved.monthLabel && saved.monthLabel !== currentMonthLabel
              ? <>Tienes guardado <strong>{saved.monthLabel}</strong> en tu cuenta</>
              : <>Este Mes Fiscal está guardado en tu cuenta</>}
            {saved.updatedAt ? <> · actualizado el {formatDate(saved.updatedAt)}</> : null}.
          </p>
          <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap", alignItems: "center" }}>
            {canSave && !savedView && !confirmingDelete && (
              confirmingUpdate ? (
                <>
                  <span style={{ ...wt.text.bodySm, color: wt.color.text }}>Esto reemplazará tu Mes Fiscal guardado con lo que ves ahora. ¿Continuar?</span>
                  <Button variant="primary" size="sm" loading={busy} disabled={busy} onClick={doSave}>Sí, reemplazar</Button>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingUpdate(false)}>Cancelar</Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" leftIcon={<Save size={15} />} disabled={busy} onClick={() => setConfirmingUpdate(true)}>
                  Actualizar lo guardado
                </Button>
              )
            )}
            {confirmingUpdate ? null : confirmingDelete ? (
              <>
                <span style={{ ...wt.text.bodySm, color: wt.color.text }}>¿Borrar el Mes Fiscal guardado?</span>
                <Button variant="danger" size="sm" loading={busy} disabled={busy} onClick={doDelete}>Sí, borrar</Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingDelete(false)}>Cancelar</Button>
              </>
            ) : (
              <Button variant="subtle" size="sm" leftIcon={<Trash2 size={15} />} disabled={busy} onClick={() => setConfirmingDelete(true)}>
                Borrar Mes Fiscal guardado
              </Button>
            )}
          </div>
        </div>
      ) : canSave ? (
        <Button variant="primary" size="sm" leftIcon={<Save size={15} />} onClick={() => setShowConsent(true)}>
          Guardar Mes Fiscal en mi cuenta
        </Button>
      ) : (
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>
          Aún no hay un Mes Fiscal para guardar. Haz un diagnóstico o sube tus CFDIs (XML/ZIP).
        </p>
      )}

      {error && (
        <p style={{ ...wt.text.caption, color: wt.color.warning, margin: `${wt.space[4]}px 0 0` }}>{error}</p>
      )}
    </Card>
  );
}
