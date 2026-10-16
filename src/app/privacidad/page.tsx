import type { Metadata } from "next";
import { PaginaLegal } from "@/components/legal/PaginaLegal";

export const metadata: Metadata = { title: "Política de privacidad — ASYGNUZ" };

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="15 de octubre de 2026">
      <p>
        ASYGNUZ (Manizales, Colombia) opera el panel de gestión disponible en app.asygnuz.com y la aplicación de Meta
        &quot;ASYGNUZ Métricas&quot;. Esta política explica qué datos tratamos cuando una empresa o creador conecta sus
        cuentas de Instagram o Meta Ads, y cómo los usamos.
      </p>

      <h2 className="text-base font-semibold">Datos que tratamos</h2>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Datos de la cuenta conectada: identificador, nombre de usuario y el token de acceso que Meta entrega al autorizar.</li>
        <li>Métricas de la cuenta y de sus publicaciones y anuncios (alcance, interacciones, seguidores, inversión y resultados).</li>
        <li>
          Comentarios y mensajes directos que las personas envían a la cuenta conectada, junto con su nombre de usuario e
          identificador de Instagram, para poder responderlos.
        </li>
      </ul>

      <h2 className="text-base font-semibold">Para qué los usamos</h2>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Mostrar a la empresa sus propias métricas y el avance de su proyecto.</li>
        <li>Responder comentarios y mensajes directos de la cuenta, de forma manual o con respuestas automáticas configuradas por la empresa.</li>
        <li>Generar reportes para la empresa dueña de la cuenta.</li>
      </ul>
      <p>
        No vendemos datos personales ni los usamos para publicidad de terceros. Solo enviamos mensajes a personas que
        escribieron o comentaron primero, dentro de los plazos que permite Meta.
      </p>

      <h2 className="text-base font-semibold">Con quién se comparten</h2>
      <p>
        Los datos se guardan en proveedores de infraestructura que actúan por cuenta de ASYGNUZ (alojamiento de la base
        de datos y del servidor). Cada empresa solo puede ver los datos de sus propias cuentas.
      </p>

      <h2 className="text-base font-semibold">Seguridad y conservación</h2>
      <p>
        Los tokens de acceso se guardan cifrados en tránsito y solo los usa el servidor; nunca se muestran en el
        navegador. Conservamos los datos mientras la cuenta esté conectada y la relación comercial siga vigente.
      </p>

      <h2 className="text-base font-semibold">Tus derechos</h2>
      <p>
        Puedes pedir acceso, corrección o eliminación de tus datos en cualquier momento. Ver{" "}
        <a className="underline" href="/eliminacion-datos">eliminación de datos</a>.
      </p>

      <h2 className="text-base font-semibold">Contacto</h2>
      <p>
        <a className="underline" href="mailto:juan.marin@asygnuz.com">juan.marin@asygnuz.com</a>
      </p>
    </PaginaLegal>
  );
}
