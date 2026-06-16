import { ImageResponse } from "next/og";

/**
 * OG image global (1200x630) para tarjetas sociales (TikTok/WhatsApp/X). Antes /opengraph-image
 * estaba referenciado pero no existia → 404. Marca minima, sin fuentes externas (usa la default
 * de satori). Aplica a todas las rutas que no definan la suya (precios/luk la heredan).
 */
export const alt = "wedge — Tu mes fiscal claro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0C1017",
          padding: 80,
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              background: "#11161F",
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 64 64">
              <path d="M32 15 L51 49 L13 49 Z" fill="#FF7A45" />
              <path d="M32 33 L41 49 L23 49 Z" fill="#11161F" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#F4F5F7" }}>wedge</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 74, fontWeight: 700, color: "#F4F5F7", lineHeight: 1.05, letterSpacing: -2 }}>
            Tu mes fiscal, claro antes del día 17.
          </div>
          <div style={{ display: "flex", fontSize: 33, color: "#9AA3B2" }}>
            ISR, IVA, pendientes y tu próxima acción. Tú validas y presentas en SAT.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#6B7280" }}>
          Fiscal OS · freelancers y personas físicas MX
        </div>
      </div>
    ),
    { ...size },
  );
}
