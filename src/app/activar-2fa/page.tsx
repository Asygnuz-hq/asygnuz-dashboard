"use client";

import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { Seguridad2FA } from "@/components/Seguridad2FA";

// Alta obligatoria de 2FA (Kaneo #37). El proxy manda aquí a todo usuario
// con sesión que todavía no tiene un factor TOTP verificado, y no lo deja
// abrir ninguna otra ruta hasta que lo active. Las rutas /api tampoco
// responden mientras tanto (bloqueoMfa en src/lib/api/mfa.ts).
export default function Activar2faPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <div className="max-w-sm w-full flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Activa la verificación en dos pasos</h1>
        <p className="text-sm text-muted">
          Para entrar al dashboard necesitas un código de tu app de autenticación (Google
          Authenticator, Authy) además de tu contraseña. Es un paso único.
        </p>
      </div>
      <div className="max-w-sm w-full">
        <Seguridad2FA
          onActivado={() => {
            router.push("/");
            router.refresh();
          }}
        />
      </div>
      <LogoutButton />
    </div>
  );
}
