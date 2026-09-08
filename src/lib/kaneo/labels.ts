// Etiquetas y colores compartidos entre las vistas que muestran tareas de
// Kaneo (Métricas, detalle de tarea, tablero) -- un solo lugar para no
// desincronizar los 4 estados/5 prioridades entre componentes.

export const ESTADO_COLOR: Record<string, string> = {
  "to-do": "#8b93a6",
  "in-progress": "#3c5e99",
  "in-review": "#c9a227",
  done: "#5c8a72",
};

export const PRIORIDAD_LABEL: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Media",
  low: "Baja",
  "no-priority": "Sin prioridad",
};
