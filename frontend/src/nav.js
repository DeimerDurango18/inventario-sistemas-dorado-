export const NAV = [
  { to: "/", end: true, label: "Dashboard", icon: "speedometer2", group: "Principal", perm: null },
  {
    to: "/activos",
    label: "Activos TI",
    icon: "pc-display",
    group: "Operación",
    perm: null,
  },
  { to: "/movimientos", label: "Movimientos", icon: "arrow-left-right", group: "Operación", perm: null },
  { to: "/stock", label: "Stock (Entradas/Salidas)", icon: "boxes", group: "Operación", perm: null },
  { to: "/mantenimientos", label: "Mantenimientos", icon: "wrench-adjustable", group: "Operación", perm: null },
  { to: "/prestamos", label: "Préstamos", icon: "box2-heart", group: "Operación", perm: null },
  { to: "/bajas", label: "Bajas", icon: "archive", group: "Operación", perm: null },
  { to: "/tickets", label: "Tickets de soporte", icon: "headset", group: "Operación", perm: null },
  { to: "/instalaciones", label: "Instalaciones", icon: "plug", group: "Operación", perm: null },
  { to: "/atenciones", label: "Atenciones de punto", icon: "tools", group: "Operación", perm: null },
  { to: "/actas", label: "Actas", icon: "file-earmark-text", group: "Operación", perm: null },
  { to: "/catalogos", label: "Catálogos", icon: "grid-1x2", group: "Administración", perm: "gestionar_catalogos" },
  { to: "/geografia", label: "Sedes y ubicaciones", icon: "geo-alt", group: "Administración", perm: "gestionar_catalogos" },
  { to: "/usuarios", label: "Usuarios y roles", icon: "people", group: "Administración", perm: "gestionar_usuarios" },
  { to: "/reportes", label: "Reportes", icon: "file-earmark-bar-graph", group: "Administración", perm: "exportar_reportes" },
  { to: "/auditoria", label: "Auditoría", icon: "clipboard-data", group: "Administración", perm: "ver_auditoria" },
  { to: "/configuracion", label: "Configuración", icon: "gear", group: "Administración", perm: "administrar_config" },
];

export function navFor(pathname) {
  const best = NAV.filter((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return best || NAV[0];
}