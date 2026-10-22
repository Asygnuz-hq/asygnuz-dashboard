import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renombró la convención "middleware" a "proxy" (corre en Node, no
// en Edge). Es la pieza que exige sesión, 2FA y módulos contratados: la
// lógica vive en updateSession, este archivo solo la engancha.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api/|lumia|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|pdf|html)$).*)",
  ],
};
