"use client";

/**
 * MesFiscalDemo — visualización de producto para el Hero (Fase 3A).
 *
 * NO es imagen genérica: es un panel "Mes Fiscal" vivo con datos ficticios
 * (Junio 2026 · 64% listo) que muestra de qué se trata Wedge antes de registrarse.
 * Compone primitivos del DS. Datos ficticios fijos (no es cálculo real).
 */
import { wt } from "@/design-system/tokens";
import {
  MonthProgress, MetricCard, StatusChip, DeadlinePill, ActionCard,
} from "@/design-system";

export function MesFiscalDemo() {
  return (
    <div
      aria-label="Ejemplo de Mes Fiscal con datos ficticios"
      style={{
        background: "linear-gradient(180deg, #19212C 0%, #10151D 62%)",
        border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.xl,
        boxShadow: `${wt.shadow.lg}, ${wt.shadow.innerTop}`,
        padding: wt.space[6],
        display: "flex",
        flexDirection: "column",
        gap: wt.space[5],
      }}
    >
      {/* Encabezado del panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: wt.space[3] }}>
          <span style={{ ...wt.text.micro, color: wt.color.textMuted }}>Mes Fiscal · ejemplo</span>
          <Badge>Datos ficticios</Badge>
        </div>
        <DeadlinePill days={4} />
      </div>

      <MonthProgress month="Junio 2026" percent={64} ready={6} pending={3} next={1} />

      {/* Métricas fiscales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: wt.space[4] }}>
        <MetricCard label="ISR estimado" value="$ 4,832" helper="RESICO PF · informativo" status={<StatusChip status="estimado" size="sm" />} />
        <MetricCard label="IVA estimado" value="$ 2,180" helper="por revisar" status={<StatusChip status="requiereRevision" size="sm" />} />
      </div>

      {/* Próxima acción */}
      <ActionCard
        variant="recommended"
        overline="Faltan 3 acciones antes del día 17"
        urgency="soon"
        title="Confirmar 2 ingresos cobrados"
        description="2 CFDIs detectados sin confirmar. Impactan tu ISR del mes."
        cta={{ label: "Revisar", onClick: () => {} }}
      />
    </div>
  );
}

/** Badge mínimo local (evita import extra; estilo del DS). */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        ...wt.text.micro,
        color: wt.color.textMuted,
        background: wt.color.neutralBg,
        border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.pill,
        padding: "3px 10px",
      }}
    >
      {children}
    </span>
  );
}
