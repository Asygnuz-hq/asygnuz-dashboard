import type { Metadata } from "next";
import { PaginaLegal } from "@/components/legal/PaginaLegal";

export const metadata: Metadata = { title: "Eliminación de datos — ASYGNUZ" };

export default function EliminacionDatosPage() {
  return (
    <PaginaLegal titulo="Instrucciones para eliminar tus datos" actualizado="15 de octubre de 2026">
      <p>
        Si conectaste tu cuenta de Instagram o Meta a la aplicación &quot;ASYGNUZ Métricas&quot;, o si nos escribiste o
        comentaste en una cuenta que la usa, puedes pedir que eliminemos tus datos.
      </p>

      <h2 className="text-base font-semibold">Opción 1: quitar el acceso desde Instagram o Facebook</h2>
      <ol className="list-decimal pl-5 flex flex-col gap-1">
        <li>En Instagram: Configuración → Apps y sitios web (o Conexiones de apps) → &quot;ASYGNUZ Métricas&quot; → Eliminar.</li>
        <li>En Facebook: Configuración → Integraciones comerciales → &quot;ASYGNUZ Métricas&quot; → Eliminar.</li>
      </ol>
      <p>Con esto la aplicación deja de tener acceso a la cuenta.</p>

      <h2 className="text-base font-semibold">Opción 2: pedirnos la eliminación</h2>
      <p>
        Escríbenos a{" "}
        <a className="underline" href="mailto:juan.marin@asygnuz.com?subject=Eliminación%20de%20datos">juan.marin@asygnuz.com</a>{" "}
        con el asunto &quot;Eliminación de datos&quot; e indica tu usuario de Instagram. Eliminaremos los tokens, métricas,
        comentarios y mensajes asociados en un plazo máximo de 30 días y te confirmaremos por correo.
      </p>
    </PaginaLegal>
  );
}
