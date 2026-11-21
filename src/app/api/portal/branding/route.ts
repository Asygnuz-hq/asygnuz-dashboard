import { extraerSubdominio } from "@/lib/portal/subdominio";
import { obtenerBrandingPorSubdominio } from "@/lib/portal/brandingServidor";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subdominio =
    searchParams.get("subdominio")?.trim().toLowerCase() ||
    extraerSubdominio(request.headers.get("host"));

  if (!subdominio) {
    return Response.json({ branding: null });
  }

  const branding = await obtenerBrandingPorSubdominio(subdominio);
  return Response.json({ branding });
}
