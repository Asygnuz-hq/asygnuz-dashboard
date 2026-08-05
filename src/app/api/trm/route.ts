import { fetchTrmOficial } from "@/lib/trmOficial";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);
  const valor = await fetchTrmOficial(fecha);
  return Response.json({ fecha, valor });
}
