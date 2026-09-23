import { LogoutButton } from "@/components/LogoutButton";

// Destino de quien inicia sesión pero su tenant no tiene ningún módulo
// activo (p. ej. usuario recién creado, todavía "Sin asignar").
export default function SinAccesoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Tu cuenta todavía no tiene acceso</h1>
      <p className="text-sm text-muted max-w-md">
        Tu usuario existe, pero aún no tiene módulos habilitados. Pídele al administrador de tu
        organización que termine de activar tu acceso.
      </p>
      <LogoutButton />
    </div>
  );
}
