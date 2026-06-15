import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { wt } from "@/design-system/tokens";

/** Link legal DS — interno (Link) o externo/mailto (a). */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("mailto:") || href.startsWith("http");
  const style: CSSProperties = { color: wt.color.orangeInk, textDecoration: "underline", textUnderlineOffset: 3 };
  return external ? (
    <a href={href} style={style}>{children}</a>
  ) : (
    <Link href={href} style={style}>{children}</Link>
  );
}

/** Sección legal numerada (DS). El texto (children) se preserva verbatim. */
export function LegalSection({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: wt.space[8] }}>
      <div style={{ ...wt.text.micro, color: wt.color.orangeInk, marginBottom: wt.space[2] }}>§ {n}</div>
      <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: 0 }}>{title}</h2>
      <div style={{ ...wt.text.body, color: wt.color.textSecondary, marginTop: wt.space[4], display: "grid", gap: wt.space[3] }}>
        {children}
      </div>
    </section>
  );
}

export const legalList: CSSProperties = {
  margin: `0 0 0 ${wt.space[6]}px`,
  padding: 0,
  display: "grid",
  gap: wt.space[3],
};
