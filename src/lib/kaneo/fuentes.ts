// Tipos compartidos cliente/servidor para las fuentes de Kaneo. Sin
// dependencias de servidor -- la resolución real (con service_role) vive en
// tenant-config.ts, que solo se importa desde rutas de API.

export const FUENTE_PRINCIPAL = "principal";

export type KaneoFuente = { id: string; nombre: string; principal: boolean };
