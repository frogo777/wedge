/**
 * Wedge Design System — barrel (Fase 2).
 *
 * Origen ÚNICO de los primitivos visuales de Wedge Fiscal OS.
 * Uso: import { Button, Card, MetricCard, wt } from "@/design-system";
 *
 * Dark-only. No mezclar con `@/app/components` (sistema light heredado).
 */

// Tokens
export { wt } from "./tokens";
export type { WedgeTokens } from "./tokens";

// Marca
export * from "./components/LogoLockup";

// Acción
export * from "./components/Button";
export * from "./components/IconButton";

// Superficies / datos
export * from "./components/Card";
export * from "./components/MetricCard";
export * from "./components/ActionCard";
export * from "./components/DataRow";

// Estado / etiquetas
export * from "./components/StatusChip";
export * from "./components/Badge";
export * from "./components/Alert";

// Formularios
export * from "./components/Input";
export * from "./components/Select";
export * from "./components/Textarea";
export * from "./components/Checkbox";

// Progreso
export * from "./components/ProgressBar";
export * from "./components/ProgressRing";

// Estados de pantalla
export * from "./components/EmptyState";
export * from "./components/LoadingState";
export * from "./components/ErrorState";

// Encabezados / estructura
export * from "./components/PageHeader";
export * from "./components/SectionHeader";
export * from "./components/TimelineStep";

// Confianza / privacidad (Fase 2.5B)
export * from "./components/TrustPanel";
export * from "./components/PermissionList";
export * from "./components/ConsentPanel";
export * from "./components/SecurityNotice";

// Progreso / retención mensual (Fase 2.5B)
export * from "./components/MonthProgress";
export * from "./components/DeadlinePill";
export * from "./components/StepChecklist";
export * from "./components/ResumeCard";

// Revisión — progressive disclosure (Fase 2.5B)
export * from "./components/ReviewItem";

// Shells
export * from "./components/AppShell";
export * from "./components/PublicShell";
