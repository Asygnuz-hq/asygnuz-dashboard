// Sin imports a propósito: scripts/test-agente-permisos.mjs prueba este archivo directo con Node.
export type TokenFila = { tenant_id: string | null; puede_escribir: boolean };

export type Denegado = { error: string; status: number };

// Un token de bandeja no entra a rutas de portal, y uno de portal no entra a la
// bandeja: /api/bandeja/agente/* devuelve conversaciones de todas las cuentas.
export function denegarEnBandeja(token: TokenFila): Denegado | null {
  if (token.tenant_id) return { error: "Este token es de un portal y no da acceso a la bandeja", status: 403 };
  return null;
}

export function denegarEnPortal(token: TokenFila, requiereEscritura: boolean): Denegado | null {
  if (!token.tenant_id) return { error: "Este token no está limitado a un portal", status: 403 };
  if (requiereEscritura && !token.puede_escribir) return { error: "Este token es de solo lectura", status: 403 };
  return null;
}
