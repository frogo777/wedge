import type { Metadata } from "next";
import { wt } from "@/design-system/tokens";
import { PublicShell } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { LegalSection, LegalLink, legalList } from "@/app/_public/legal-ui";

/* wedge — Términos del Servicio (v1). Ajustados al alcance real de esta versión
   (sin facturación ni conexión SAT). Marco: copiloto fiscal informativo;
   el usuario valida y presenta en el SAT. */

export const metadata: Metadata = {
  title: "Términos del servicio — wedge",
  description:
    "Términos y condiciones de uso de wedge: copiloto fiscal informativo para freelancers MX. Tú validas y presentas en el SAT.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />}>
      <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Legal</div>
      <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>Términos del servicio</h1>
      <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, marginTop: wt.space[4] }}>
        Estos términos rigen tu uso de wedge. Léelos: definen qué es (y qué no es) el servicio, y la
        responsabilidad de cada parte. Al usar wedge aceptas estos términos.
      </p>
      <div style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[5] }}>
        Última actualización: 15 de junio de 2026
      </div>

      <LegalSection n="1" title="Aceptación">
        <p>Al crear una cuenta o usar wedge (la &ldquo;Plataforma&rdquo;) aceptas estos Términos y el{" "}
          <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink>. Si no estás de acuerdo, no uses el
          servicio. wedge es operado por una persona física con actividad empresarial registrada en México.</p>
      </LegalSection>

      <LegalSection n="2" title="Qué es wedge (y qué no es)">
        <p>wedge es un <strong>copiloto fiscal informativo</strong> para personas físicas en RESICO PF y
          Honorarios. Organiza tus CFDIs, calcula estimados de ISR/IVA y te muestra qué falta antes del día 17.</p>
        <ul style={legalList}>
          <li><strong>wedge prepara; tú validas y presentas en el SAT.</strong> Los cálculos son un
            <strong> estimado informativo</strong>, no asesoría fiscal certificada ni sustituto de un contador.</li>
          <li>wedge <strong>no declara, no paga ni modifica información en el SAT</strong> por ti.</li>
          <li>La presentación y el pago de tus impuestos los realizas <strong>tú</strong> (o tu contador) en
            los canales oficiales del SAT y de tu banco.</li>
          <li>luk es un asistente determinístico que detecta señales y explica qué revisar; <strong>no es un
            contador</strong> ni presenta declaraciones.</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Tu cuenta">
        <p>Eres responsable de la confidencialidad de tus credenciales y de la actividad en tu cuenta. Debes
          proporcionar información veraz y notificarnos de inmediato cualquier uso no autorizado escribiendo a
          <LegalLink href="mailto:security@wedgemx.com"> security@wedgemx.com</LegalLink>. Debes ser mayor de
          edad para usar wedge.</p>
      </LegalSection>

      <LegalSection n="4" title="Uso aceptable">
        <p>Te obligas a no: (i) usar wedge para fines ilícitos o para evadir obligaciones fiscales; (ii)
          intentar vulnerar la seguridad o el aislamiento entre usuarios; (iii) cargar contenido que no te
          pertenezca o que infrinja derechos de terceros; (iv) automatizar el uso de forma abusiva. Podemos
          suspender cuentas que incumplan estas reglas.</p>
      </LegalSection>

      <LegalSection n="5" title="Tus datos y tus CFDIs">
        <p>Tus datos fiscales y tus CFDIs son <strong>tuyos</strong>. Los XML que cargas se procesan en tu
          navegador y no se suben ni se guardan; solo persistimos, si lo pides, un <strong>resumen redactado</strong>
          de tu Mes Fiscal. El tratamiento de datos se rige por el{" "}
          <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink>.</p>
      </LegalSection>

      <LegalSection n="6" title="Propiedad intelectual">
        <p>El software, la marca, el diseño y el contenido de wedge son propiedad del responsable o de sus
          licenciantes. Te otorgamos una licencia limitada, no exclusiva e intransferible para usar la
          Plataforma conforme a estos Términos. Tu información y tus documentos siguen siendo tuyos.</p>
      </LegalSection>

      <LegalSection n="7" title="Exención y limitación de responsabilidad (deslinde fiscal)">
        <p>Los cálculos y resúmenes de wedge son <strong>estimados informativos</strong> basados en la
          información que tú ingresas y en las tarifas oficiales vigentes (LISR/LIVA). <strong>No constituyen
          asesoría fiscal, contable ni legal</strong> y no sustituyen la revisión de un profesional autorizado.</p>
        <p>En la máxima medida permitida por la ley, wedge <strong>no será responsable</strong> por: (a)
          consecuencias fiscales (recargos, multas, diferencias) derivadas de decisiones que tomes con base en
          la información mostrada; (b) inexactitudes en datos que tú ingresaste o en CFDIs que cargaste; (c)
          indisponibilidad o errores de servicios de terceros (incluido el SAT); (d) daños indirectos,
          incidentales o lucro cesante. <strong>La validación y presentación final de tus declaraciones es tu
          responsabilidad.</strong> El servicio se ofrece &ldquo;tal cual&rdquo;, sin garantías implícitas.</p>
      </LegalSection>

      <LegalSection n="8" title="Disponibilidad y cambios">
        <p>wedge está en evolución activa; podemos modificar, suspender o discontinuar funciones. Procuramos
          alta disponibilidad pero no garantizamos un servicio ininterrumpido. Podemos actualizar estos
          Términos; ante cambios sustanciales te avisaremos y la versión vigente se publicará en esta página.</p>
      </LegalSection>

      <LegalSection n="9" title="Terminación">
        <p>Puedes dejar de usar wedge y cancelar tu cuenta cuando quieras (ejerciendo tus derechos ARCO desde
          el <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink>). Podemos suspender o terminar tu
          acceso ante incumplimientos de estos Términos o requerimientos legales.</p>
      </LegalSection>

      <LegalSection n="10" title="Ley aplicable y jurisdicción">
        <p>Estos Términos se rigen por las leyes mexicanas. Para cualquier controversia, las partes se someten
          a la jurisdicción de los tribunales competentes en la Ciudad de México, renunciando a cualquier otro
          fuero que pudiera corresponderles.</p>
      </LegalSection>

      <LegalSection n="11" title="Contacto">
        <p>Dudas sobre estos Términos:{" "}
          <LegalLink href="mailto:hola@wedgemx.com">hola@wedgemx.com</LegalLink>. Documentos relacionados:{" "}
          <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink> ·{" "}
          <LegalLink href="/legal/uso-credenciales-sat">Uso de credenciales SAT</LegalLink> ·{" "}
          <LegalLink href="/seguridad">Seguridad</LegalLink>.</p>
      </LegalSection>
    </PublicShell>
  );
}
