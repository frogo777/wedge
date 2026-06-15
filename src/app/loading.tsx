import { wt } from "@/design-system/tokens";

/**
 * Estado de carga global en el DS oscuro (evita parpadeo a pantalla default).
 */

export default function Loading() {
  return (
    <div style={{ minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.textMuted, fontFamily: wt.font.sans, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden style={{ width: 18, height: 18, border: `2px solid ${wt.color.border}`, borderTopColor: wt.color.orange, borderRadius: "50%", display: "inline-block", animation: "wg-spin 0.7s linear infinite" }} />
        <span style={{ ...wt.text.bodySm }}>Cargando…</span>
      </div>
      <style>{"@keyframes wg-spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
