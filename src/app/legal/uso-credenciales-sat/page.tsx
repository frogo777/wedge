import type { Metadata } from "next";
import { wt } from "@/design-system/tokens";
import { PublicShell } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { LegalSection, LegalLink, legalList } from "@/app/_public/legal-ui";

/* wedge — Autorización para uso de credenciales SAT
   LFPDPPP + CFF Art. 17-D / 18 + RMF · Última actualización: 2026-04-30
   (La conexión SAT NO está implementada en v1; este documento es la base de
   transparencia para cuando se habilite — el marco de "qué NO haremos" aplica.) */

export const metadata: Metadata = {
  title: "Autorización para uso de credenciales SAT — wedge",
  description:
    "Términos bajo los que wedge usaría tus credenciales del SAT (e.firma o CIEC): únicamente descarga de CFDIs y consulta de declaraciones. Qué NO hará.",
  alternates: { canonical: "/legal/uso-credenciales-sat" },
};

export default function UsoCredencialesSatPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />}>
      <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Legal</div>
      <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>
        Autorización para uso de credenciales SAT
      </h1>
      <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, marginTop: wt.space[4] }}>
        Este documento describe, con precisión y en lenguaje llano, los términos bajo los cuales
        autorizarías a wedge a utilizar tus credenciales del Servicio de Administración Tributaria
        (e.firma o Contraseña / CIEC). Léelo antes de subir cualquier credencial.
      </p>
      <div style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[5] }}>
        Última actualización: 30 de abril de 2026 · La conexión SAT aún no está disponible en esta versión.
      </div>

      <LegalSection n="1" title="Identificación del responsable">
        <p>El responsable del tratamiento de tus credenciales SAT es <strong>wedge</strong>, marca operada
          por una persona física con actividad empresarial registrada en México (en adelante,
          &ldquo;wedge&rdquo; o &ldquo;el responsable&rdquo;).</p>
        <ul style={legalList}>
          <li><strong>Identificación legal del responsable:</strong> disponible bajo solicitud al correo de contacto.</li>
          <li><strong>Domicilio:</strong> el indicado en el <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink>.</li>
          <li><strong>Correo de contacto:</strong> <LegalLink href="mailto:privacidad@wedgemx.com">privacidad@wedgemx.com</LegalLink></li>
        </ul>
        <p>Esta autorización es complementaria al <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink> y
          a los <LegalLink href="/terminos">Términos del Servicio</LegalLink>. En caso de contradicción
          aparente, este documento prevalece sobre ambos respecto al uso de credenciales SAT.</p>
      </LegalSection>

      <LegalSection n="2" title="Naturaleza y alcance de la autorización">
        <p>Al cargar tu e.firma (archivos <code>.cer</code>, <code>.key</code> y contraseña) o tu Contraseña
          del SAT (CIEC) en wedge, <strong>autorizas expresamente</strong> al responsable a utilizarlas en tu
          nombre <strong>únicamente</strong> para los siguientes fines:</p>
        <ul style={legalList}>
          <li><strong>(a) Descarga masiva de CFDIs</strong> emitidos y recibidos a través de los servicios
            públicos del SAT, en los periodos que tú selecciones desde la aplicación.</li>
          <li><strong>(b) Consulta de declaraciones presentadas</strong> por ti o tu contador, a efecto de
            mostrarte un resumen, comparativos y obligaciones pendientes.</li>
          <li><strong>(c) Presentación de declaraciones ante el SAT</strong> &mdash; esta funcionalidad
            <strong> actualmente NO está implementada en wedge</strong>. Cuando se implemente requerirá un
            consentimiento adicional, expreso y específico por cada presentación; tu autorización
            <strong> no</strong> habilita esta acción.</li>
        </ul>
        <p>La autorización está limitada a los fines anteriores. Cualquier uso fuera de este alcance requiere
          de tu consentimiento adicional, otorgado dentro de la propia aplicación, antes de la acción
          correspondiente.</p>
      </LegalSection>

      <LegalSection n="3" title="Lo que wedge NO hará con tus credenciales">
        <p>Para evitar cualquier ambigüedad, wedge se obliga expresamente a <strong>no</strong> realizar las
          siguientes acciones, ni siquiera teniendo la capacidad técnica para hacerlo:</p>
        <ul style={legalList}>
          <li><strong>No modificará tu RFC</strong> ni dará de alta o baja obligaciones, domicilios o
            actividades económicas en tu cédula de identificación fiscal.</li>
          <li><strong>No actualizará tus datos en el SAT</strong> sin un consentimiento explícito, por
            separado, otorgado por ti dentro de la aplicación para esa acción puntual.</li>
          <li><strong>No emitirá CFDIs</strong> a tu nombre ni utilizará tu Certificado de Sello Digital,
            salvo activación expresa y futura de una funcionalidad de facturación que requerirá
            consentimiento independiente.</li>
          <li><strong>No compartirá tus credenciales con terceros.</strong> Tampoco las usará personal de
            wedge para fines distintos a los descritos en la sección 2; los accesos quedan registrados en
            bitácora.</li>
          <li><strong>No usará tus credenciales para entrenar modelos de inteligencia artificial.</strong>
            Los datos descargados (CFDIs) tampoco se usan con ese fin sin anonimización y agregación previa.</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Almacenamiento seguro">
        <p>Tus credenciales se almacenan cifradas en reposo con los siguientes parámetros técnicos,
          auditables en el código fuente del responsable:</p>
        <ul style={legalList}>
          <li><strong>Algoritmo:</strong> AES-256-GCM (cifrado autenticado, con detección de modificación).</li>
          <li><strong>Derivación de llave por usuario:</strong> HKDF-SHA256 sobre una llave maestra
            resguardada en variables de entorno cifradas. Cada usuario obtiene una llave efectiva única; el
            descifrado de un registro <strong>no</strong> compromete a los demás.</li>
          <li><strong>Vector de inicialización (IV):</strong> 96 bits, generado al azar por cada operación de cifrado.</li>
          <li><strong>Etiqueta de autenticación:</strong> 128 bits; cualquier alteración del texto cifrado
            provoca una falla de descifrado y un evento en bitácora.</li>
          <li><strong>Tránsito:</strong> TLS 1.2 o superior entre tu dispositivo, los servidores de wedge y el SAT.</li>
        </ul>
        <p>Un volcado de la base de datos por sí solo <strong>no</strong> permite recuperar tus credenciales:
          la llave maestra reside fuera de la base de datos, en almacenamiento cifrado del proveedor de hospedaje.</p>
      </LegalSection>

      <LegalSection n="5" title="Revocación de la autorización">
        <p>Podrás <strong>revocar esta autorización en cualquier momento, sin justificar motivo y sin
          costo</strong>:</p>
        <ul style={legalList}>
          <li>Desde la aplicación, cuando la conexión SAT esté disponible (Configuración → SAT →
            Desconectar): la acción eliminará los archivos de e.firma y/o la Contraseña CIEC almacenados; la
            eliminación es definitiva.</li>
          <li>Por correo: escribiendo a <LegalLink href="mailto:privacidad@wedgemx.com">privacidad@wedgemx.com</LegalLink>
            con tu nombre, RFC y la solicitud expresa de revocación. Procesaremos la eliminación en un plazo
            máximo de 5 días hábiles.</li>
        </ul>
        <p>La revocación opera hacia el futuro y no afecta la legitimidad de los tratamientos realizados antes
          de la misma. Los CFDIs ya descargados a tu cuenta permanecen en ella, salvo que también solicites su
          eliminación.</p>
      </LegalSection>

      <LegalSection n="6" title="Responsabilidad">
        <p><strong>De wedge.</strong> El responsable se obliga a tratar tus credenciales con la diligencia de
          un profesional en la materia y a aplicar las medidas de seguridad descritas en la sección 4.
          Responde por los daños y perjuicios que se deriven de un uso indebido de las credenciales
          <strong> imputable directamente al responsable o a su personal</strong>.</p>
        <p><strong>Del usuario.</strong> Tú declaras y te obligas a que: (i) las credenciales que cargas son
          tuyas y fueron obtenidas legítimamente del SAT; (ii) los datos fiscales asociados a ellas son
          veraces; (iii) no compartirás tu cuenta de wedge con terceros; y (iv) notificarás de inmediato al
          responsable si sospechas que tu cuenta o tus credenciales han sido comprometidas, escribiendo a
          <LegalLink href="mailto:security@wedgemx.com"> security@wedgemx.com</LegalLink>.</p>
        <p>wedge no responde por: (a) actos u omisiones del propio SAT, incluyendo indisponibilidad de sus
          servicios; (b) inexactitudes en los CFDIs descargados, cuya información proviene íntegramente del
          SAT; (c) consecuencias fiscales derivadas de decisiones del usuario o de su contador con base en la
          información mostrada por la plataforma.</p>
      </LegalSection>

      <LegalSection n="7" title="Marco legal aplicable">
        <p>La presente autorización se otorga al amparo de las siguientes disposiciones:</p>
        <ul style={legalList}>
          <li><strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares
            (LFPDPPP)</strong>, su Reglamento y los Lineamientos del Aviso de Privacidad &mdash; consentimiento
            expreso para el tratamiento de datos personales sensibles.</li>
          <li><strong>Código Fiscal de la Federación, Artículos 17-D y 18</strong> &mdash; naturaleza y efectos
            de la firma electrónica avanzada (e.firma) y de la Contraseña como medio de identificación
            electrónica ante el SAT.</li>
          <li><strong>Resolución Miscelánea Fiscal (RMF)</strong> vigente, en las reglas aplicables al uso de
            la e.firma, la CIEC y los servicios de descarga masiva de CFDIs.</li>
          <li><strong>Código Civil Federal</strong> en lo relativo al mandato y a la representación
            voluntaria, supletoriamente.</li>
        </ul>
        <p>Para cualquier controversia relacionada con esta autorización, las partes se someten a las leyes
          mexicanas y a la jurisdicción de los tribunales competentes en la Ciudad de México, renunciando a
          cualquier otro fuero que pudiera corresponderles.</p>
      </LegalSection>

      <div style={{ marginTop: wt.space[9], paddingTop: wt.space[6], borderTop: `1px solid ${wt.color.border}` }}>
        <p style={{ ...wt.text.bodySm, color: wt.color.textMuted }}>
          Documentos relacionados: <LegalLink href="/privacidad">Aviso de Privacidad</LegalLink> ·{" "}
          <LegalLink href="/terminos">Términos del Servicio</LegalLink> ·{" "}
          <LegalLink href="/seguridad">Seguridad</LegalLink>.
        </p>
      </div>
    </PublicShell>
  );
}
