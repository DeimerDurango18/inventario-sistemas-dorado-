export function fmtMoney(n) {
  if (n === null || n === undefined) return "—";
  return "$ " + Number(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

export function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export const OP_STATES = {
  SOLICITADO: { label: "Solicitado", cls: "warning" },
  ACTIVO: { label: "Activo", cls: "info" },
  DEVUELTO: { label: "Devuelto", cls: "success" },
  ABIERTO: { label: "Abierto", cls: "warning" },
  ABIERTA: { label: "Abierta", cls: "warning" },
  RESUELTO: { label: "Resuelto", cls: "success" },
  RESUELTA: { label: "Resuelta", cls: "success" },
  CERRADO: { label: "Cerrado", cls: "secondary" },
  CANCELADO: { label: "Cancelado", cls: "secondary" },
  CANCELADA: { label: "Cancelada", cls: "secondary" },
  RECHAZADO: { label: "Rechazado", cls: "danger" },
  RECHAZADA: { label: "Rechazada", cls: "danger" },
  EN_PROCESO: { label: "En proceso", cls: "warning" },
  EN_ATENCION: { label: "En atención", cls: "info" },
  REGISTRADO: { label: "Registrado", cls: "info" },
  ANULADO: { label: "Anulado", cls: "dark" },
  PROGRAMADO: { label: "Programado", cls: "info" },
  EN_PROGRESO: { label: "En progreso", cls: "warning" },
  COMPLETADO: { label: "Completado", cls: "success" },
  COMPLETADA: { label: "Completada", cls: "success" },
  GENERADA: { label: "Generada", cls: "success" },
  SOLICITADA: { label: "Solicitada", cls: "warning" },
  APROBADA: { label: "Aprobada", cls: "success" },
  ASIGNACION: { label: "Asignación", cls: "info" },
  TRASLADO: { label: "Traslado", cls: "primary" },
  DEVOLUCION: { label: "Devolución", cls: "success" },
  PRESTAMO: { label: "Préstamo", cls: "warning" },
  MANTENIMIENTO: { label: "Mantenimiento", cls: "danger" },
  INSTALACION: { label: "Instalación", cls: "primary" },
  SOPORTE: { label: "Soporte", cls: "info" },
  DONACION: { label: "Donación", cls: "primary" },
  OBSOLETA: { label: "Obsoleta", cls: "secondary" },
  DANADA: { label: "Dañada", cls: "danger" },
  VENTA: { label: "Venta", cls: "warning" },
  PERDIDA: { label: "Pérdida", cls: "dark" },
  AJUSTE: { label: "Ajuste", cls: "primary" },
  ENTRADA: { label: "Entrada", cls: "success" },
  SALIDA: { label: "Salida", cls: "warning" },
};

export function estadoInfo(st) {
  const e = OP_STATES[String(st || "").toUpperCase()];
  return e ? { label: e.label, cls: e.cls } : { label: st || "—", cls: "secondary" };
}

const ESTADO_COLORS = {
  SOLICITADO: ["#f79009", "#f790091c"],
  SOLICITADA: ["#f79009", "#f790091c"],
  ACTIVO: ["#0b66c2", "#0b66c217"],
  DEVUELTO: ["#17b26a", "#17b26a1c"],
  ABIERTO: ["#f79009", "#f790091c"],
  ABIERTA: ["#f79009", "#f790091c"],
  RESUELTO: ["#17b26a", "#17b26a1c"],
  RESUELTA: ["#17b26a", "#17b26a1c"],
  CERRADO: ["#64748b", "#64748b1c"],
  CANCELADO: ["#64748b", "#64748b1c"],
  RECHAZADO: ["#eb3f5b", "#eb3f5b1c"],
  RECHAZADA: ["#eb3f5b", "#eb3f5b1c"],
  REGISTRADO: ["#0b66c2", "#0b66c217"],
  ANULADO: ["#64748b", "#64748b1c"],
  PROGRAMADO: ["#0b66c2", "#0b66c217"],
  EN_PROGRESO: ["#f79009", "#f790091c"],
  EN_PROCESO: ["#f79009", "#f790091c"],
  EN_ATENCION: ["#0b66c2", "#0b66c217"],
  COMPLETADO: ["#17b26a", "#17b26a1c"],
  COMPLETADA: ["#17b26a", "#17b26a1c"],
  CANCELADA: ["#64748b", "#64748b1c"],
  GENERADA: ["#17b26a", "#17b26a1c"],
  APROBADA: ["#17b26a", "#17b26a1c"],
  APROBADO: ["#17b26a", "#17b26a1c"],
  AJUSTE: ["#0b66c2", "#0b66c217"],
  ENTRADA: ["#17b26a", "#17b26a1c"],
  SALIDA: ["#f79009", "#f790091c"],
};

export function estadoColor(st) {
  const key = String(st || "").toUpperCase();
  return ESTADO_COLORS[key] || ["#64748b", "#64748b1c"];
}