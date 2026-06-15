import type { Metadata } from "next";
import { wt } from "@/design-system/tokens";
import { PublicShell } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { LegalSection, LegalLink, legalList } from "@/app/_public/legal-ui";

/* wedge — Aviso de Privacidad (LFPDPPP, DOF 20-mar-2025).
   v1: la lista de encargados (§6) refleja SOLO el stack real de esta versión
   (Supabase, Vercel, PostHog, Clarity, Sentry). SAT/billing/IA no están en v1. */

export const metadata: Metadata = {
  title: "Aviso de privacidad — wedge",
  description:
    "Aviso de privacidad de wedge conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />}>
      <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Legal</div>
      <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>Aviso de privacidad</h1>
      <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, marginTop: wt.space[4] }}>
        Tu información fiscal es tuya. Aquí explicamos con claridad qué recolectamos, por qué, cómo la
        protegemos y los derechos que la ley mexicana te reconoce.
      </p>
      <div style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[5] }}>
        Última actualización: 15 de junio de 2026
      </div>

      <LegalSection n="1" title="Responsable del tratamiento">
        <p>wedge (la marca, &ldquo;nosotros&rdquo;) es responsable del tratamiento de tus datos personales
          conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares</strong> (LFPDPPP), publicada en el DOF el 20 de marzo de 2025 y vigente desde el 21 de
          marzo de 2025, así como su Reglamento.</p>
        <p>La autoridad encargada de la supervisión en materia de protección de datos personales en posesión
          de particulares es la <strong>Secretaría Anticorrupción y Buen Gobierno</strong> (SABG), que
          sustituyó al INAI a partir del 21 de marzo de 2025.</p>
        <p>Para cualquier asunto relacionado con tus datos escríbenos a{" "}
          <LegalLink href="mailto:privacidad@wedgemx.com">privacidad@wedgemx.com</LegalLink>.</p>
      </LegalSection>

      <LegalSection n="2" title="Qué datos personales recolectamos">
        <p>Para operar el servicio recolectamos y tratamos los siguientes datos:</p>
        <ul style={legalList}>
          <li><strong>Datos de identificación:</strong> correo electrónico y, cuando lo proporcionas, tu nombre.</li>
          <li><strong>Datos fiscales que tú ingresas:</strong> régimen fiscal (RESICO PF, Honorarios), ingreso
            mensual aproximado y respuestas de tu diagnóstico.</li>
          <li><strong>CFDIs que cargas (XML/ZIP):</strong> se procesan <strong>en tu navegador</strong> para
            calcular tu estimado; <strong>no se suben ni se guardan</strong> los XML en nuestros servidores.</li>
          <li><strong>Resumen redactado del Mes Fiscal:</strong> si decides guardarlo en tu cuenta,
            almacenamos solo agregados (montos estimados, pendientes), <strong>nunca</strong> RFC/UUID
            completos ni CFDIs crudos.</li>
          <li><strong>Datos técnicos:</strong> dirección IP, navegador y registros de acceso con fines de seguridad.</li>
        </ul>
        <p>La integración con el SAT (e.firma / CIEC) <strong>no está disponible en esta versión</strong>.
          Cuando se habilite, su uso se regirá por la{" "}
          <LegalLink href="/legal/uso-credenciales-sat">Autorización para uso de credenciales SAT</LegalLink>,
          y nunca solicitaremos esas credenciales sin que actives explícitamente la integración.</p>
      </LegalSection>

      <LegalSection n="3" title="Para qué usamos tus datos (finalidades)">
        <p><strong>Finalidades primarias</strong> (necesarias para el servicio):</p>
        <ul style={legalList}>
          <li>Crear y mantener tu cuenta y sesión.</li>
          <li>Calcular tu ISR/IVA como estimado informativo conforme a tu régimen.</li>
          <li>Guardar (si lo pides) el resumen redactado de tu Mes Fiscal.</li>
          <li>Responder tus solicitudes de soporte y cumplir obligaciones legales.</li>
        </ul>
        <p><strong>Finalidades secundarias</strong> (puedes oponerte sin afectar el servicio):</p>
        <ul style={legalList}>
          <li>Analítica de producto anónima/seudonimizada (solo si aceptas cookies de analítica).</li>
          <li>Comunicaciones sobre mejoras o contenido educativo fiscal.</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Cómo protegemos tu información">
        <p>Almacenamos tus datos en infraestructura de <strong>Supabase</strong> (PostgreSQL administrado).
          Aplicamos:</p>
        <ul style={legalList}>
          <li><strong>TLS 1.2+</strong> en tránsito.</li>
          <li><strong>AES-256</strong> en reposo (base de datos y respaldos).</li>
          <li><strong>Row Level Security (RLS)</strong>: cada usuario solo lee y escribe sus propios registros.</li>
          <li>Contraseñas resguardadas con funciones de derivación estándar.</li>
          <li>Accesos internos limitados y con bitácora.</li>
        </ul>
        <p>Ninguna medida es infalible: elige una contraseña fuerte y no la compartas.</p>
      </LegalSection>

      <LegalSection n="5" title="Quién tiene acceso a tus datos (encargados)">
        <p><strong>No vendemos ni rentamos tus datos.</strong> En esta versión compartimos información
          únicamente con los siguientes encargados, obligados por contrato a tratar tus datos conforme a
          nuestras instrucciones y a la LFPDPPP:</p>
        <ul style={legalList}>
          <li><strong>Supabase Inc.</strong> (EE.UU.) — base de datos y autenticación.</li>
          <li><strong>Vercel Inc.</strong> (EE.UU.) — hospedaje y entrega de la aplicación web.</li>
          <li><strong>PostHog Inc.</strong> (EE.UU.) — analítica de producto, seudonimizada y solo con tu
            consentimiento de cookies.</li>
          <li><strong>Microsoft Clarity</strong> (EE.UU.) — métricas de uso, solo con tu consentimiento.</li>
          <li><strong>Sentry, Inc.</strong> (EE.UU.) — monitoreo de errores, datos seudonimizados.</li>
        </ul>
        <p>Al aceptar este Aviso otorgas tu consentimiento para estas transferencias en términos del artículo
          36 de la LFPDPPP. <strong>Ningún dato fiscal se transfiere a redes publicitarias ni brokers de
          datos.</strong> Si en el futuro sumamos un proveedor (p.ej. correo transaccional o conexión SAT),
          actualizaremos esta lista antes de usarlo.</p>
      </LegalSection>

      <LegalSection n="6" title="Retención de datos">
        <p>Conservamos tus datos mientras tu cuenta esté activa. Si la cancelas, eliminamos o anonimizamos tu
          información en un plazo máximo de <strong>90 días</strong>, salvo obligación legal de conservarlos
          por más tiempo.</p>
      </LegalSection>

      <LegalSection n="7" title="Derechos ARCO y revocación del consentimiento">
        <p>Conforme a los artículos 22 a 35 de la LFPDPPP tienes derecho a:</p>
        <ul style={legalList}>
          <li><strong>Acceso</strong> — saber qué datos tuyos tenemos y cómo los usamos.</li>
          <li><strong>Rectificación</strong> — corregir datos inexactos o incompletos.</li>
          <li><strong>Cancelación</strong> — solicitar que eliminemos tus datos.</li>
          <li><strong>Oposición</strong> — oponerte al tratamiento para finalidades específicas.</li>
          <li><strong>Revocar</strong> el consentimiento otorgado y <strong>limitar</strong> el uso de tus datos.</li>
        </ul>
        <p>Para ejercerlos envía una solicitud a{" "}
          <LegalLink href="mailto:privacidad@wedgemx.com">privacidad@wedgemx.com</LegalLink> con: (i) tu nombre
          y correo registrado; (ii) descripción del derecho que ejerces; (iii) identificación. Responderemos
          en un máximo de <strong>20 días hábiles</strong> (art. 32 LFPDPPP). Si consideras vulnerado tu
          derecho, puedes acudir a la <strong>Secretaría Anticorrupción y Buen Gobierno</strong> (
          <LegalLink href="https://www.gob.mx/buengobierno">gob.mx/buengobierno</LegalLink>).</p>
      </LegalSection>

      <LegalSection n="8" title="Cookies y tecnologías similares">
        <p>Usamos cookies estrictamente necesarias para mantener tu sesión. Las cookies de analítica
          (PostHog/Clarity) solo se activan si las aceptas en el banner de consentimiento; puedes rechazarlas
          sin afectar el servicio.</p>
      </LegalSection>

      <LegalSection n="9" title="Menores de edad">
        <p>wedge está dirigido a personas físicas contribuyentes. No recolectamos conscientemente datos de
          menores de 18 años; si detectas un caso, escríbenos y los eliminaremos.</p>
      </LegalSection>

      <LegalSection n="10" title="Cambios a este aviso">
        <p>Podemos actualizar este aviso para reflejar cambios en el producto o la ley. Publicaremos la
          versión vigente en esta misma página y, ante cambios sustanciales, te avisaremos por correo.</p>
      </LegalSection>

      <LegalSection n="11" title="Contacto">
        <p>Departamento de Privacidad · wedge<br />
          Correo: <LegalLink href="mailto:privacidad@wedgemx.com">privacidad@wedgemx.com</LegalLink><br />
          Soporte general: <LegalLink href="mailto:hola@wedgemx.com">hola@wedgemx.com</LegalLink></p>
      </LegalSection>
    </PublicShell>
  );
}
