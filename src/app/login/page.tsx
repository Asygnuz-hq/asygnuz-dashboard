import { headers } from "next/headers";
import { extraerSubdominio } from "@/lib/portal/subdominio";
import { obtenerBrandingPorSubdominio } from "@/lib/portal/brandingServidor";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const hdrs = await headers();
  const params = await searchParams;
  // Permite previsualizar en local vía /login?portal=lumia además de lumia.asygnuz.com
  const subdominio =
    extraerSubdominio(hdrs.get("host")) ||
    (params.portal ? params.portal.trim().toLowerCase() : null);

  const branding = subdominio ? await obtenerBrandingPorSubdominio(subdominio) : null;

  return <LoginClient branding={branding} />;
}
