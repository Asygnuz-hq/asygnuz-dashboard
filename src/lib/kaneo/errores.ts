// Error HTTP de Kaneo. El mensaje NO lleva el cuerpo de respuesta de Kaneo: ese
// detalle se queda en los logs del servidor y nunca viaja al navegador.
export class KaneoHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "KaneoHttpError";
  }
}

// Los ids de Kaneo (cuid) solo llevan letras, números, guion y guion bajo.
// Se valida antes de interpolarlos en una URL: sin esto un id como "../x"
// cambiaba la ruta que se le pedía a Kaneo (path traversal dentro del Kaneo
// del propio tenant, con su propia key).
export function idSeguro(id: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new KaneoHttpError(400, "Identificador inválido");
  }
  return id;
}
