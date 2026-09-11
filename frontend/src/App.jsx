import { useEffect, useRef, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const statLabels = {
  disponibles: 'Disponibles',
  asignados: 'Asignados',
  reparacion: 'En reparación',
  baja: 'Baja',
  prestamo: 'Préstamo',
}

const PIE_COLORS = ['#0082FF', '#16a34a', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'stock', label: 'Stock', icon: 'box' },
  { id: 'historial', label: 'Historial', icon: 'history' },
  { id: 'equipos', label: 'Equipos', icon: 'devices' },
  { id: 'entradas', label: 'Entradas', icon: 'download' },
  { id: 'salidas', label: 'Salidas', icon: 'upload' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
  { id: 'prestamos', label: 'Préstamos', icon: 'swap' },
  { id: 'puntos', label: 'Sedes', icon: 'building' },
  { id: 'soporte', label: 'Soporte', icon: 'support' },
  { id: 'usuarios', label: 'Usuarios', icon: 'user' },
  { id: 'reportes', label: 'Reportes', icon: 'chart' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings' },
]

const sectionHelp = {
  dashboard: {
    resumen: 'Vista general con los totales de equipos, valor, actas y alertas del sistema.',
    pasos: ['Revisa los totales de equipos por estado', 'Atiende las alertas de mantenimiento', 'Usa el buscador de arriba para ir directo a un equipo'],
    accion: null,
  },
  stock: {
    resumen: 'Aquí vives todo tu inventario: cuántos equipos hay, de qué categoría y dónde están ubicados.',
    pasos: ['Mira los totales por categoría y ubicación', 'Presiona "Registrar equipo" para añadir uno nuevo al inventario', 'Cada tarjeta muestra el estado y disponibilidad del equipo'],
    accion: 'stock',
  },
  historial: {
    resumen: 'Línea de tiempo de todo lo que ha pasado con tus equipos: entradas, salidas, préstamos y traspasos.',
    pasos: ['Filtra por tipo de movimiento o búsqueda', 'Haz clic en un movimiento para ver su detalle y acta'],
    accion: 'entradas',
  },
  equipos: {
    resumen: 'Registro maestro de tus equipos: folio, marca, modelo, serie, fotos y estado actual.',
    pasos: ['Usa "+ Nuevo equipo" para registrar uno', 'Usa la lupa o busca por folio/serie para encontrarlo rápido', 'Cada fila permite editar, ver detalle o dar de baja'],
    accion: 'equipos',
  },
  entradas: {
    resumen: 'Registra la entrada de equipos nuevos al inventario. Cada entrada genera una acta PDF.',
    pasos: ['Selecciona el equipo y el responsable', 'Completa la ubicación o punto de instalación', 'Al confirmar se genera el acta para imprimir o enviar'],
    accion: 'entradas',
  },
  salidas: {
    resumen: 'Registra la salida de equipos (entregas, ventas o traslados). También genera acta.',
    pasos: ['Elige el equipo que sale y el destino', 'Indica responsable o destino final', 'Confirma para generar el acta de salida'],
    accion: 'salidas',
  },
  mantenimiento: {
    resumen: 'Agenda y controla mantenimientos preventivos y correctivos de tus equipos.',
    pasos: ['Programa con "+ Nuevo mantenimiento"', 'Marca el tipo: preventivo o correctivo', 'Las alertas del Dashboard te avisan de los que vencen'],
    accion: 'mantenimiento',
  },
  prestamos: {
    resumen: 'Controla equipos prestados, devoluciones y traspasos entre ubicaciones.',
    pasos: ['Registra un préstamo a un responsable externo', 'Usa devolución cuando te regresen el equipo', 'Traslada equipos de una ubicación a otra sin sacarlos'],
    accion: 'prestamos',
  },
  puntos: {
    resumen: 'Farmacias o sedes a las que se les envía y recibe equipo, y cuyo equipo debe mantenerse.',
    pasos: ['Registra la sede o farmacia', 'Elige la sede como destino cuando generes una salida', 'El mantenimiento grupal de una sede se registra desde Mantenimiento'],
    accion: 'puntos',
  },
  soporte: {
    resumen: 'Solicitudes y casos de soporte técnico asociados a los equipos.',
    pasos: ['Abre una solicitud de soporte', 'Asígnala a un técnico o responsable', 'Sigue el estado hasta su cierre'],
    accion: 'soporte',
  },
  usuarios: {
    resumen: 'Administración de cuentas de los operadores del sistema.',
    pasos: ['Crea usuarios con rol admin u operativo', 'Cada usuario tiene su propio acceso', 'No compartas cuentas: este menú solo lo ve el admin'],
    accion: 'usuarios',
  },
  reportes: {
    resumen: 'Exporta la información del inventario en Excel o PDF para informes.',
    pasos: ['Elige el rango de fechas y el tipo de reporte', 'Descarga el archivo generado lista para compartir'],
    accion: 'reportes',
  },
  configuracion: {
    resumen: 'Parámetros generales del sistema: empresa, correos, moneda y notificaciones.',
    pasos: ['Revisa que los datos de tu empresa estén correctos', 'Los cambios se aplican a los documentos que generes'],
    accion: 'configuracion',
  },
}

const initialStats = {
  totales: {
    disponibles: 0,
    asignados: 0,
    reparacion: 0,
    baja: 0,
  },
  mes: 'Sin datos',
}

function parseImportCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  if (!headers.includes('marca')) return []
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = (vals[idx] || '').trim()
    })
    if (!row.marca || !row.modelo) continue
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQ = false }
      } else { cur += ch }
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function Icon({ name }) {
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h7v7H4zm9 0h7v4h-7zm0 6h7v10h-7zM4 13h7v7H4z" />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    ),
    devices: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h9a2 2 0 0 1 2 2v5H9a2 2 0 0 0-2 2v3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm10 7h4a2 2 0 0 1 2 2v5h-6v-7zm-8 9h6v-4H7v4z" />
      </svg>
    ),
    download: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v10l4-4 1.4 1.4L12 18.8 6.6 13.4 8 12l4 4V3zm-8 16h16v2H4z" />
      </svg>
    ),
    upload: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21V11l-4 4-1.4-1.4L12 7.2l5.4 6.4L16 15l-4-4v10zm-8-2h16v2H4z" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16v2H4zm1-3h3V8H5zm5 0h3V4h-3zm5 0h3v-6h-3z" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94.7.7 0 0 0-.05-.23l1.9-1.48a.7.7 0 0 0 .17-.89l-1.8-3.12a.7.7 0 0 0-.84-.25l-2.25 1a6.82 6.82 0 0 0-1.63-.94L13.2 4.3a.7.7 0 0 0-.7-.54h-3.6a.7.7 0 0 0-.7.54l-.43 2.35a6.82 6.82 0 0 0-1.62.94l-2.25-1a.7.7 0 0 0-.85.25L.9 9.35a.7.7 0 0 0 .17.89l1.9 1.48a.7.7 0 0 0 .05.23.7.7 0 0 0-.05.23L1.07 13.66a.7.7 0 0 0-.17.89l1.8 3.12a.7.7 0 0 0 .84.25l2.25-1c.5.39 1.04.7 1.62.94l.43 2.35a.7.7 0 0 0 .7.54h3.6a.7.7 0 0 0 .7-.54l.43-2.35c.58-.24 1.12-.55 1.62-.94l2.25 1a.7.7 0 0 0 .84-.25l1.8-3.12a.7.7 0 0 0-.17-.89zm-7.14 1.56a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.7 19.3 15.6 12.2A6 6 0 0 0 8 4.3L11.3 7.6 9.9 9 6.6 5.7A6 6 0 0 0 13.9 13.3L21 20.4a1 1 0 0 0 1.4 0l.3-.3a1 1 0 0 0 0-1.4z" />
      </svg>
    ),
    tag: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.4 11.6 12.4 2.6a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z" />
      </svg>
    ),
    pin: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.4 0-9 2.2-9 5v2h18v-2c0-2.8-4.6-5-9-5z" />
      </svg>
    ),
    building: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16h5v2H2v-2h2zm4 0h4v-4H8v4zm0-8h4V9H8v4zm6 0h2V9h-2v4z" />
      </svg>
    ),
    box: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 16.5V7.5L12 2 3 7.5v9l9 5.5 9-5.5zM12 4.2l6.5 4-6.5 4-6.5-4 6.5-4zM4.8 9.5l6.2 3.8v7.2l-6.2-3.8V9.5zm8.2 11V13.3l6.2-3.8v7.2l-6.2 3.8z" />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7 6.95 6.95 0 0 1-4.95-2.05l-1.42 1.42A8.96 8.96 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z" />
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
    ),
    fileText: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    ),
    printer: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      </svg>
    ),
    support: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-9-9 7 7 0 0 1 7 7v2.5a2.5 2.5 0 0 1-5 0V12h2v1.5a1 1 0 0 0 2 0V10a5.5 5.5 0 0 0-11 0v5a2.5 2.5 0 0 1-2.5 2.5H4a9 9 0 0 0 17-5.5M12 9a2 2 0 0 0-2 2h4a2 2 0 0 0-2-2z" />
      </svg>
    ),
    swap: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
      </svg>
    ),
  }

  return <span className="nav-icon">{icons[name] || icons.grid}</span>
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('inv_app_settings') || '{}')
      return cfg.tema === 'dark' ? 'dark' : 'light'
    } catch { return 'light' }
  })
  const [activeSection, setActiveSection] = useState('dashboard')
  const [token, setToken] = useState(() => localStorage.getItem('inv_token') || '')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inv_user') || 'null') } catch { return null }
  })
  const [loginForm, setLoginForm] = useState({ correo: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [helpStep, setHelpStep] = useState(0)
  const [guideOpen, setGuideOpen] = useState(false)
  const [stats, setStats] = useState(initialStats)
  const [equipos, setEquipos] = useState([])
  const [entryCount, setEntryCount] = useState(24)
  const [exitCount, setExitCount] = useState(12)
  const [reportCount, setReportCount] = useState(18)
  const [configSaved, setConfigSaved] = useState(false)
  const [apiUrlDraft, setApiUrlDraft] = useState(
    () => (localStorage.getItem('api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8500').replace(/\/+$/, '')
  )

  const handleSaveApiUrl = () => {
    const value = apiUrlDraft.trim().replace(/\/+$/, '')
    if (!value) {
      showToast('Ingresa una URL de servidor válida')
      return
    }
    localStorage.setItem('api_url', value)
    setApiBase(value)
    showToast('Servidor guardado. Se aplica a partir de la próxima conexión.')
  }

  const handleResetApiUrl = () => {
    localStorage.removeItem('api_url')
    const fallback = (import.meta.env.VITE_API_URL || 'http://localhost:8500').replace(/\/+$/, '')
    setApiUrlDraft(fallback)
    setApiBase(fallback)
    showToast('URL del servidor restablecida al valor del build.')
  }
  const [depreciacion, setDepreciacion] = useState(null)
  const [toasts, setToasts] = useState([])
  const [equipmentForm, setEquipmentForm] = useState({
    folio: '',
    marca: '',
    modelo: '',
    serie: '',
    ubicacion: '',
    estado: 'disponible',
    categoria_id: '',
    ubicacion_id: '',
    valor_aprox: '',
    observaciones: '',
  })
  const [editingEquipmentId, setEditingEquipmentId] = useState(null)
  const [entryForm, setEntryForm] = useState({ responsable: '', ubicacion: '', cajas: '1', email: '' })
  const [entryItems, setEntryItems] = useState([
    { equipo_id: '', cantidad: '1', precio: '', seriales: [''] },
  ])
  const [entryPhotos, setEntryPhotos] = useState([])
  const [exitForm, setExitForm] = useState({ responsable: '', destino: '', destino_otro: '', email: '' })
  const [exitItems, setExitItems] = useState([{ equipo_id: '', cantidad: '1', seriales: [''] }])
  const [exitPhotos, setExitPhotos] = useState([])

  const [categorias, setCategorias] = useState([])
  const [categoriaForm, setCategoriaForm] = useState({ nombre: '', descripcion: '' })

  const [ubicaciones, setUbicaciones] = useState([])
  const [ubicacionForm, setUbicacionForm] = useState({ nombre: '', ciudad: '', direccion: '' })

  const [usuarios, setUsuarios] = useState([])
  const [usuarioForm, setUsuarioForm] = useState({ nombre: '', correo: '', rol: 'operativo', password: '' })
  const [editingUsuarioId, setEditingUsuarioId] = useState(null)

  const [mantenimientos, setMantenimientos] = useState([])
  const [mantenimientoForm, setMantenimientoForm] = useState({
    equipo_id: '',
    equipo_folio: '',
    punto_id: '',
    punto_nombre: '',
    tipo: 'preventivo',
    descripcion: '',
    tecnico: '',
    prioridad: 'media',
    fecha_programada: '',
    piezas: '',
    periodicidad: 'mensual',
  })

  // Alertas de mantenimiento por vencer
  const [mtAlertas, setMtAlertas] = useState([])
  // Acta grupal de mantenimiento por visita (farmacia/sede)
  const [actasMt, setActasMt] = useState([])
  const [mtGrupalForm, setMtGrupalForm] = useState({ cliente: '', tecnico: '', prioridad: 'media', observaciones: '' })
  const [mtGrupalItems, setMtGrupalItems] = useState([{ nombre_equipo: '', serie: '' }])
  // Evidencia (foto) por subir al mantenimiento
  const [mtEvidenciaFile, setMtEvidenciaFile] = useState(null)
  const [mtEvidenciaTarget, setMtEvidenciaTarget] = useState(null)
  // Historial de mantenimiento por equipo (modal)
  const [mtHistorial, setMtHistorial] = useState([])
  const [mtHistorialOpen, setMtHistorialOpen] = useState(false)
  const [mtHistorialEquipo, setMtHistorialEquipo] = useState(null)
  // Paginación de tablas
  const [mtPage, setMtPage] = useState(1)
  const [mtgPage, setMtgPage] = useState(1)
  const MT_PAGE_SIZE = 10
  // Reportes de mantenimiento (por técnico / por sede)
  const fmtFechaLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const [mtRepDesde, setMtRepDesde] = useState(() => fmtFechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [mtRepHasta, setMtRepHasta] = useState(() => fmtFechaLocal(new Date()))
  const [mtRepData, setMtRepData] = useState(null)
  const [mtRepModo, setMtRepModo] = useState(null)
  const [mtRepCargando, setMtRepCargando] = useState(false)

  // Estados para Fotografía de Equipo
  const [equipmentPhotoFile, setEquipmentPhotoFile] = useState(null)
  const [equipmentPhotoPreview, setEquipmentPhotoPreview] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const importInputRef = useRef(null)

  // Estados para Detalle e Historial de Equipo
  const [selectedEquipmentForDetail, setSelectedEquipmentForDetail] = useState(null)
  const [equipmentHistory, setEquipmentHistory] = useState([])
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Estados para Escáner QR (Soporte Lector Hardware)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerStatus, setScannerStatus] = useState('')
  const [scannerInput, setScannerInput] = useState('')
  const scannerInputRef = useRef(null)

  // FASE 10: baja/venta y préstamo
  const [bajaPrestamoModal, setBajaPrestamoModal] = useState(null) // {tipo:'baja'|'venta'|'prestamo', equipo}
  const [bajaPrestamoForm, setBajaPrestamoForm] = useState({ motivo: '', precio_venta: '', prestamo_a: '', fecha_fin: '' })

  // FASE 12: préstamos (sección) y traspasos
  const [prestamoSectionForm, setPrestamoSectionForm] = useState({ equipo_id: '', prestamo_a: '', motivo: '', fecha_fin: '' })
  const [traspasoModal, setTraspasoModal] = useState(null) // equipo a traspasar
  const [traspasoForm, setTraspasoForm] = useState({ ubicacion_id: '', motivo: '' })

  // Estados para Actas, Visor Modal y Creación
  const [actas, setActas] = useState([])
  const [selectedActa, setSelectedActa] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Estados para Soporte (tickets internos)
  const [tickets, setTickets] = useState([])
  const [ticketForm, setTicketForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    estado: 'abierto',
    tecnico: currentUser?.nombre || '',
    equipo_id: '',
    ubicacion_id: '',
  })
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null)
  const [ticketAdjuntos, setTicketAdjuntos] = useState([])
  const [ticketFilterEstado, setTicketFilterEstado] = useState('todos')
  const [firmaActaForm, setFirmaActaForm] = useState({ nombre: '', documento: '' })
  const [firmaModalOpen, setFirmaModalOpen] = useState(false)
  const [firmaAplicando, setFirmaAplicando] = useState(false)

  // Estados para Puntos de Venta / Instalaciones
  const [puntos, setPuntos] = useState([])
  const [puntoForm, setPuntoForm] = useState({
    nombre: '',
    tipo: 'drogueria',
    ciudad: '',
    direccion: '',
    telefono: '',
    responsable: '',
    coordinador_celular: '',
    estado: 'activo',
  })
  const [puntoModalOpen, setPuntoModalOpen] = useState(false)
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null)
  const [puntoModalMode, setPuntoModalMode] = useState('crear') // crear | detalle
  const [puntoInstalacionForm, setPuntoInstalacionForm] = useState({
    tipo: 'instalar',
    equipo_id: '',
    software: '',
    observaciones: '',
  })
  const [puntoAtencionForm, setPuntoAtencionForm] = useState({
    tipo: 'soporte',
    descripcion: '',
    tecnico: '',
    resultado: '',
  })
  const [adjuntosEquipo, setAdjuntosEquipo] = useState([])
  const [adjuntosUploading, setAdjuntosUploading] = useState(false)
  const adjuntosInputRef = useRef(null)

  // Filtros para el Módulo de Stock
  const [stockFilterOnlyAvailable, setStockFilterOnlyAvailable] = useState(false)
  const [stockCategoryFilter, setStockCategoryFilter] = useState('todas')
  const [stockLocationFilter, setStockLocationFilter] = useState('todas')
  const [stockStatusFilter, setStockStatusFilter] = useState('todos')
  const [stockSearchQuery, setStockSearchQuery] = useState('')
  const [stockPage, setStockPage] = useState(1)
  const [stockSortKey, setStockSortKey] = useState('folio')
  const [stockSortDir, setStockSortDir] = useState('asc')
  const STOCK_PAGE_SIZE = 20
  const [stockSelected, setStockSelected] = useState([])
  const [bulkAction, setBulkAction] = useState({ tipo: '', valor: '' })
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // FASE 8: multi-empresa
  const [empresas, setEmpresas] = useState([])
  const [empresaForm, setEmpresaForm] = useState({ nombre: '', nit: '', telefono: '', direccion: '', logo_path: '' })
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false)
  const [empresaEditingId, setEmpresaEditingId] = useState(null)
  // Configuración consolidada
  const [appSettings, setAppSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inv_app_settings') || '{}') } catch { return {} }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Notificaciones (FASE 7)
  const [notificaciones, setNotificaciones] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifLeidas, setNotifLeidas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inv_notif_leidas') || '[]') } catch { return [] }
  })

  // Filtros para el Módulo de Historial
  const [historialSearchQuery, setHistorialSearchQuery] = useState('')
  const [historialTipoFilter, setHistorialTipoFilter] = useState('todos')

  // Formulario de emisión de Acta
  const [createActaForm, setCreateActaForm] = useState({
    tipo: 'SALIDA',
    entregado_por: 'Ing. Henrique Escorcia',
    proyecto: '',
    responsable_destino: '',
    ciudad_destino: 'Bogotá',
    direccion_destino: '',
    observaciones: '',
    valor_aprox: '',
    cajas: 1,
    fotos: [],
    items: [
      { dispositivo: '', marca: '', detalle: '', cantidad: 1, serial: '', equipo_id: null },
    ],
  })

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  // URL de la API con resolución en runtime:
  // 1) override del usuario (localStorage 'api_url', configurable en Configuración),
  // 2) config.json publicado junto al bundle (sirve si cambia la URL del túnel sin rebuild),
  // 3) URL horneada en el build (VITE_API_URL) o localhost en desarrollo.
  const [apiBase, setApiBase] = useState(
    () => localStorage.getItem('api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8500'
  )
  const API_BASE = apiBase.replace(/\/+$/, '')

  useEffect(() => {
    if (localStorage.getItem('api_url')) return
    fetch(`${import.meta.env.BASE_URL}config.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg && cfg.apiUrl && !localStorage.getItem('api_url')) {
          setApiBase(cfg.apiUrl)
        }
      })
      .catch(() => {})
  }, [])

  const canModify = !!currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'supervisor')
  const canAdmin = !!currentUser && currentUser.rol === 'admin'

  // Sube las fotos seleccionadas a un acta recién creada (máximo 3).
  const subirFotosActa = async (actaId, fotos) => {
    if (!fotos || fotos.length === 0) return
    for (let i = 0; i < fotos.length; i++) {
      try {
        const fd = new FormData()
        fd.append('file', fotos[i])
        await api(`/api/reports/actas/${actaId}/fotos`, { method: 'POST', body: fd })
      } catch {
        // Una foto fallida no invalida el acta; se continúa con las demás.
      }
    }
  }

  // Helper que añade el token JWT a todas las llamadas a la API e intercepta 401.
  const api = async (path, options = {}) => {
    const headers = { ...(options.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
      if (res.status === 401) {
        handleLogout()
        showToast('Sesión expirada. Por favor ingresa nuevamente.')
      }
      return res
    } catch (err) {
      throw err
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    if (!loginForm.correo || !loginForm.password) {
      setLoginError('Ingresa tu correo y contraseña')
      return
    }
    setLogging(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: loginForm.correo, password: loginForm.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLogging(false)
        setLoginError(data.detail || 'Credenciales incorrectas')
        return
      }
      setToken(data.access_token)
      setCurrentUser(data.user)
      localStorage.setItem('inv_token', data.access_token)
      localStorage.setItem('inv_user', JSON.stringify(data.user))
      setLoginForm({ correo: '', password: '' })
      setLogging(false)
      if (!localStorage.getItem('inv_help')) {
        setShowHelp(true)
        setHelpStep(0)
      }
      showToast(`Bienvenido, ${data.user.nombre}`)
    } catch {
      setLogging(false)
      setLoginError('No se pudo conectar con el servidor')
    }
  }

  const handleGlobalSearch = async (q) => {
    setSearchQuery(q)
    if (!q || q.length < 2) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    try {
      const res = await api(`/api/inventory/equipos/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
        setIsSearchOpen(data.length > 0)
      }
    } catch (err) {
      console.error('Error searching equipment:', err)
    }
  }

  const handleLogout = () => {
    setToken('')
    setCurrentUser(null)
    localStorage.removeItem('inv_token')
    localStorage.removeItem('inv_user')
    setActiveSection('dashboard')
    showToast('Sesión cerrada')
  }

  const loadCategorias = () => {
    api('/api/catalogo/categorias')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCategorias(data) })
      .catch(() => {})
  }

  const loadUbicaciones = () => {
    api('/api/catalogo/ubicaciones')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setUbicaciones(data) })
      .catch(() => {})
  }

  const loadCatalogos = () => {
    loadCategorias()
    loadUbicaciones()
  }

  const loadUsuarios = () => {
    if (currentUser?.rol === 'admin') {
      api('/api/usuarios')
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setUsuarios(data) })
        .catch(() => {})
    }
  }

  const loadEmpresas = () => {
    api('/api/empresas/')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setEmpresas(data) })
      .catch(() => {})
  }

  const handleEmpresaSubmit = async (e) => {
    e.preventDefault()
    if (!empresaForm.nombre.trim()) {
      showToast('El nombre de la empresa es obligatorio')
      return
    }
    try {
      if (empresaEditingId) {
        const res = await api(`/api/empresas/${empresaEditingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empresaForm),
        })
        if (res.ok) {
          showToast('Empresa actualizada')
        } else {
          const err = await res.json().catch(() => ({}))
          showToast(err.detail || 'No se pudo actualizar la empresa')
        }
      } else {
        const res = await api('/api/empresas/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empresaForm),
        })
        if (res.ok) {
          showToast('Empresa creada')
        } else {
          const err = await res.json().catch(() => ({}))
          showToast(err.detail || 'No se pudo crear la empresa')
        }
      }
      setEmpresaForm({ nombre: '', nit: '', telefono: '', direccion: '', logo_path: '' })
      setEmpresaEditingId(null)
      setEmpresaModalOpen(false)
      loadEmpresas()
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleDeleteEmpresa = async (empresa) => {
    if (!window.confirm(`¿Eliminar la empresa "${empresa.nombre}"?`)) return
    try {
      const res = await api(`/api/empresas/${empresa.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Empresa eliminada')
        loadEmpresas()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar la empresa')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const loadMantenimientos = async () => {
    try {
      const resM = await api('/api/mantenimientos')
      if (resM.ok) {
        const data = await resM.json()
        if (Array.isArray(data)) {
          setMantenimientos(data)
          setMtPage(1)
        }
      } else {
        const err = await resM.json().catch(() => ({}))
        showToast(err.detail || 'No se pudieron cargar los mantenimientos')
      }
    } catch {
      showToast('No se pudieron cargar los mantenimientos')
    }
    try {
      const resA = await api('/api/reports/mantenimiento/alertas')
      if (resA.ok) {
        const data = await resA.json()
        if (Array.isArray(data)) setMtAlertas(data)
      }
    } catch {
      // Las alertas son complementarias; no bloquear la sección.
    }
    loadActasMt()
  }

  const loadActasMt = async () => {
    try {
      const res = await api('/api/actas-mantenimiento')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setActasMt(data)
          setMtgPage(1)
        }
      }
    } catch {
      // mantener estado anterior
    }
  }

  const loadPuntos = () => {
    api('/api/puntos')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setPuntos(data) })
      .catch(() => {})
  }

  const loadNotificaciones = () => {
    api('/api/notificaciones')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setNotificaciones(data) })
      .catch(() => {})
  }

  const markNotifRead = (id) => {
    setNotifLeidas((current) => {
      const next = current.includes(id) ? current : [...current, id]
      localStorage.setItem('inv_notif_leidas', JSON.stringify(next))
      return next
    })
  }

  const handleSeedCatalogos = async () => {
    try {
      const res = await api('/api/catalogo/seed', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        showToast(data.message || 'Catálogos inicializados con éxito')
        loadCatalogos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudieron inicializar los catálogos')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleOpenEquipmentDetail = async (equipo) => {
    setSelectedEquipmentForDetail(equipo)
    setIsDetailModalOpen(true)
    try {
      const res = await api(`/api/inventory/equipos/historial/${equipo.id}`)
      if (res.ok) {
        const data = await res.json()
        setEquipmentHistory(Array.isArray(data) ? data : [])
      } else {
        setEquipmentHistory([])
      }
    } catch {
      setEquipmentHistory([])
    }
    abrirAdjuntosEquipo(equipo.id)
  }

  const handleBajaPrestamoSubmit = async () => {
    if (!bajaPrestamoModal) return
    const { tipo, equipo } = bajaPrestamoModal
    const body = {}
    let url = ''
    if (tipo === 'baja') {
      body.tipo_baja = 'baja'
      body.motivo = bajaPrestamoForm.motivo
      url = `/api/inventory/equipos/${equipo.id}/baja`
    } else if (tipo === 'venta') {
      body.tipo_baja = 'venta'
      body.motivo = bajaPrestamoForm.motivo
      body.precio_venta = bajaPrestamoForm.precio_venta ? Number(bajaPrestamoForm.precio_venta) : null
      url = `/api/inventory/equipos/${equipo.id}/baja`
    } else if (tipo === 'prestamo') {
      body.prestamo_a = bajaPrestamoForm.prestamo_a
      body.motivo = bajaPrestamoForm.motivo
      body.fecha_fin = bajaPrestamoForm.fecha_fin ? new Date(bajaPrestamoForm.fecha_fin).toISOString() : null
      url = `/api/inventory/equipos/${equipo.id}/prestamo`
    }
    if (!url) return
    if (tipo === 'prestamo' && !body.prestamo_a) {
      showToast('Indica a quién se presta el equipo')
      return
    }
    try {
      const res = await api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        showToast(tipo === 'baja' ? 'Equipo dado de baja' : tipo === 'venta' ? 'Venta registrada' : 'Préstamo registrado')
        setBajaPrestamoModal(null)
        setBajaPrestamoForm({ motivo: '', precio_venta: '', prestamo_a: '', fecha_fin: '' })
        setIsDetailModalOpen(false)
        loadEquipos()
        loadStats()
      } else {
        const e = await res.json().catch(() => ({}))
        showToast(e.detail || 'No se pudo completar la acción')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleRetornoPrestamo = async (equipo) => {
    if (!window.confirm('¿Marcar el retorno del préstamo de este equipo?')) return
    try {
      const res = await api(`/api/inventory/equipos/${equipo.id}/retorno-prestamo`, { method: 'POST' })
      if (res.ok) {
        showToast('Retorno de préstamo registrado')
        setIsDetailModalOpen(false)
        loadEquipos()
        loadStats()
      } else {
        const e = await res.json().catch(() => ({}))
        showToast(e.detail || 'No se pudo registrar el retorno')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const openScanner = () => {
    setIsScannerOpen(true)
    setScannerStatus('Listo para escanear... Use el lector de barras/QR')
    setScannerInput('')
  }

  const handlePrestamoSectionSubmit = async (e) => {
    e.preventDefault()
    if (!prestamoSectionForm.equipo_id || !prestamoSectionForm.prestamo_a) {
      showToast('Selecciona el equipo e indica a quién se presta')
      return
    }
    const body = {
      prestamo_a: prestamoSectionForm.prestamo_a,
      motivo: prestamoSectionForm.motivo || null,
      fecha_fin: prestamoSectionForm.fecha_fin ? new Date(prestamoSectionForm.fecha_fin).toISOString() : null,
    }
    const equipoSel = equipos.find((e) => String(e.id) === String(prestamoSectionForm.equipo_id))
    if (equipoSel && !equipoSel.serie?.trim()) {
      showToast('Este equipo no tiene número de serie; edítalo en Stock antes de prestarlo')
      return
    }
    try {
      const res = await api(`/api/inventory/equipos/${prestamoSectionForm.equipo_id}/prestamo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        showToast('Préstamo registrado')
        setPrestamoSectionForm({ equipo_id: '', prestamo_a: '', motivo: '', fecha_fin: '' })
        loadEquipos()
        loadStats()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo registrar el préstamo')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleAbrirTraspaso = (equipo) => {
    setTraspasoForm({ ubicacion_id: '', motivo: '' })
    setTraspasoModal(equipo)
  }

  const handleTraspasoSubmit = async () => {
    if (!traspasoModal) return
    if (!traspasoForm.ubicacion_id) {
      showToast('Selecciona la ubicación de destino')
      return
    }
    try {
      const res = await api(`/api/inventory/equipos/${traspasoModal.id}/traspaso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ubicacion_id: Number(traspasoForm.ubicacion_id),
          motivo: traspasoForm.motivo || null,
        }),
      })
      if (res.ok) {
        showToast('Equipo traspasado correctamente')
        setTraspasoModal(null)
        setIsDetailModalOpen(false)
        loadEquipos()
        loadStats()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo realizar el traspaso')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleScannerSubmit = (e) => {
    e.preventDefault()
    if (scannerInput.trim()) {
      handleScannedQr(scannerInput)
    }
    setScannerInput('')
    setIsScannerOpen(false)
  }

  const handleScannedQr = async (raw) => {
    // Nuevas etiquetas QR: URL pública -> /consulta/equipos/{id}
    const mUrl = String(raw).match(/[/\\]consulta[/\\]equipos[/\\](\d+)/)
    if (mUrl && mUrl[1]) {
      const id = Number(mUrl[1])
      const eq = equipos.find((e) => e.id === id)
      if (eq) {
        setScannerStatus('Equipo encontrado: ' + (eq.folio || id))
        handleOpenEquipmentDetail(eq)
      } else {
        try {
          const res = await api(`/api/inventory/equipos/${id}`)
          if (res.ok) {
            const data = await res.json()
            if (data && data.id) {
              setScannerStatus('Equipo encontrado: ' + (data.folio || id))
              handleOpenEquipmentDetail(data)
            } else {
              setScannerStatus('Equipo no encontrado en el inventario.')
            }
          } else {
            setScannerStatus('Equipo no encontrado en el inventario.')
          }
        } catch {
          setScannerStatus('Sin conexión con el servidor al procesar el QR.')
        }
      }
      return
    }
    // QR legacy: EQUIPO|folio|marca modelo|serie|estado|ubicacion
    const parts = String(raw).split('|').map((s) => s.trim())
    const folio = parts[1] && parts[1] !== 'undefined' ? parts[1] : (parts[3] || '')
    if (!folio) {
      setScannerStatus('El QR escaneado no corresponde a un equipo del sistema.')
      return
    }
    try {
      const res = await api(`/api/inventory/equipos/buscar?q=${encodeURIComponent(folio)}`)
      if (res.ok) {
        const lista = await res.json()
        const data = Array.isArray(lista) && lista.length ? lista[0] : null
        if (data && data.id) {
          setScannerStatus('Equipo encontrado: ' + (data.folio || folio))
          handleOpenEquipmentDetail(data)
        } else {
          setScannerStatus('Equipo no encontrado en el inventario.')
        }
      } else {
        setScannerStatus('Equipo no encontrado en el inventario.')
      }
    } catch {
      setScannerStatus('Sin conexión con el servidor al procesar el QR.')
    }
  }

  // Carga los datos iniciales al iniciar sesión con token.
  useEffect(() => {
    if (!token) return
    loadStats()
    loadEquipos()
    loadActas()
    loadCatalogos()
    loadUsuarios()
    loadMantenimientos()
    loadNotificaciones()
    loadTickets()
    loadPuntos()
  }, [token])

  const loadEquipos = () => {
    api('/api/inventory/equipos')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setEquipos(data) })
      .catch(() => {})
  }

  const loadActas = () => {
    api('/api/reports/actas')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setActas(data) })
      .catch(() => {})
  }

  const loadStats = () => {
    api('/api/reports/dashboard')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(initialStats))
  }

  const loadTickets = () => {
    api('/api/soporte')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setTickets(data) })
      .catch(() => {})
  }

  const downloadViaApi = async (path) => {
    try {
      const res = await api(path)
      if (!res.ok) {
        showToast('Error al generar el archivo')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disp = res.headers.get('Content-Disposition') || ''
      const m = disp.match(/filename="?([^";]+)"?/i)
      a.download = m ? m[1] : 'descarga'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const openViaApi = async (path) => {
    try {
      const res = await api(path)
      if (!res.ok) {
        showToast('No se pudo generar el documento')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      showToast('Abriendo documento (PDF)')
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleTicketCrear = async (e) => {
    e.preventDefault()
    if (!ticketForm.titulo) {
      showToast('Escribe el título del ticket')
      return
    }
    try {
      const res = await api('/api/soporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: ticketForm.titulo,
          descripcion: ticketForm.descripcion || '',
          prioridad: ticketForm.prioridad,
          estado: ticketForm.estado,
          tecnico: ticketForm.tecnico || null,
          equipo_id: ticketForm.equipo_id ? Number(ticketForm.equipo_id) : null,
          ubicacion_id: ticketForm.ubicacion_id ? Number(ticketForm.ubicacion_id) : null,
        }),
      })
      if (res.ok) {
        showToast('Ticket de soporte creado')
        setTicketForm((f) => ({ ...f, titulo: '', descripcion: '' }))
        setTicketModalOpen(false)
        loadTickets()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo crear el ticket')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleTicketEstado = async (ticket, nuevoEstado) => {
    try {
      const res = await api(`/api/soporte/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        const upd = await res.json()
        setTickets((curr) => curr.map((t) => (t.id === upd.id ? upd : t)))
        if (ticketSeleccionado && ticketSeleccionado.id === upd.id) {
          setTicketSeleccionado(upd)
        }
        showToast(`Ticket actualizado a ${nuevoEstado}`)
        loadNotificaciones()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'Error al actualizar el ticket')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleTicketEliminar = async (ticket) => {
    if (!window.confirm(`¿Eliminar el ticket "${ticket.titulo}"?`)) return
    try {
      const res = await api(`/api/soporte/${ticket.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Ticket eliminado')
        setTickets((curr) => curr.filter((t) => t.id !== ticket.id))
        loadNotificaciones()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const abrirTicketDetalle = async (ticket) => {
    setTicketSeleccionado(ticket)
    setTicketModalOpen(true)
    setTicketAdjuntos([])
    try {
      const res = await api(`/api/adjuntos?tipo=ticket&ref_id=${ticket.id}`)
      if (res.ok) {
        const data = await res.json()
        setTicketAdjuntos(Array.isArray(data) ? data : [])
      }
    } catch { /* sin adjuntos */ }
  }

  const handlePuntoSubmit = async (event) => {
    event.preventDefault()
    if (!puntoForm.nombre.trim()) {
      showToast('Indica el nombre del punto')
      return
    }
    try {
      const editId = puntoSeleccionado && puntoModalMode === 'editar' ? puntoSeleccionado.id : null
      const res = editId
        ? await api(`/api/puntos/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(puntoForm),
          })
        : await api('/api/puntos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(puntoForm),
          })
      if (res.ok) {
        showToast(editId ? 'Sede actualizada' : 'Sede creada')
        setPuntoModalOpen(false)
setPuntoForm({ nombre: '', tipo: 'drogueria', ciudad: '', direccion: '', telefono: '', responsable: '', coordinador_celular: '', estado: 'activo' })
        setPuntoSeleccionado(null)
        setPuntoModalMode('crear')
        loadPuntos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo guardar el punto')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const abrirPuntoDetalle = async (punto) => {
    try {
      const res = await api(`/api/puntos/${punto.id}`)
      if (res.ok) {
        const data = await res.json()
        setPuntoSeleccionado(data)
        setPuntoModalMode('detalle')
        setPuntoModalOpen(true)
        setPuntoInstalacionForm({ tipo: 'instalar', equipo_id: '', software: '', observaciones: '' })
        setPuntoAtencionForm({ tipo: 'soporte', descripcion: '', tecnico: currentUser?.nombre || '', resultado: '' })
      } else {
        showToast('No se pudo abrir el detalle del punto')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const abrirPuntoCrear = () => {
    setPuntoForm({ nombre: '', tipo: 'drogueria', ciudad: '', direccion: '', telefono: '', responsable: '', estado: 'activo' })
    setPuntoSeleccionado(null)
    setPuntoModalMode('crear')
    setPuntoModalOpen(true)
  }

  const abrirPuntoEditar = (punto) => {
    setPuntoForm({
      nombre: punto.nombre || '',
      tipo: punto.tipo || 'drogueria',
      ciudad: punto.ciudad || '',
      direccion: punto.direccion || '',
      telefono: punto.telefono || '',
      responsable: punto.responsable || '',
      coordinador_celular: punto.coordinador_celular || '',
      estado: punto.estado || 'activo',
    })
    setPuntoSeleccionado(punto)
    setPuntoModalMode('editar')
    setPuntoModalOpen(true)
  }

  const handlePuntoEliminar = async (punto) => {
    if (!window.confirm(`¿Eliminar la sede "${punto.nombre}"? Los equipos vinculados a ella no se borran.`)) return
    try {
      const res = await api(`/api/puntos/${punto.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Punto eliminado')
        loadPuntos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar el punto')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handlePuntoInstalacionSubmit = async (event) => {
    event.preventDefault()
    const puntoId = puntoSeleccionado && puntoSeleccionado.id
    if (!puntoId || !puntoInstalacionForm.equipo_id) {
      showToast('Selecciona el equipo a instalar o retirar')
      return
    }
    try {
      if (puntoInstalacionForm.tipo === 'retirar') {
        const activas = (puntoSeleccionado.instalaciones || []).filter((i) => i.estado === 'activa' && String(i.equipo_id) === String(puntoInstalacionForm.equipo_id))
        const target = activas[0]
        if (!target) {
          showToast('Ese equipo no tiene instalación activa en el punto')
          return
        }
        const res = await api(`/api/puntos/instalaciones/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'retirada' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          showToast(err.detail || 'No se pudo retirar el equipo')
          return
        }
        showToast('Equipo retirado del punto')
      } else {
        const res = await api(`/api/puntos/${puntoId}/instalaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            punto_id: puntoId,
            equipo_id: puntoInstalacionForm.equipo_id,
            software: puntoInstalacionForm.software || null,
            observaciones: puntoInstalacionForm.observaciones || null,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          showToast(err.detail || 'No se pudo instalar el equipo')
          return
        }
        showToast('Equipo instalado en el punto')
      }
      setPuntoInstalacionForm({ tipo: 'instalar', equipo_id: '', software: '', observaciones: '' })
      const resDetalle = await api(`/api/puntos/${puntoId}`)
      if (resDetalle.ok) setPuntoSeleccionado(await resDetalle.json())
      loadPuntos()
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handlePuntoAtencionSubmit = async (event) => {
    event.preventDefault()
    const puntoId = puntoSeleccionado && puntoSeleccionado.id
    if (!puntoId || !puntoAtencionForm.descripcion.trim()) {
      showToast('Describe la atención realizada')
      return
    }
    try {
      const res = await api(`/api/puntos/${puntoId}/atenciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          punto_id: puntoId,
          tipo: puntoAtencionForm.tipo,
          descripcion: puntoAtencionForm.descripcion,
          tecnico: puntoAtencionForm.tecnico || currentUser?.nombre || null,
          resultado: puntoAtencionForm.resultado || null,
        }),
      })
      if (res.ok) {
        showToast('Atención registrada')
        setPuntoAtencionForm({ tipo: 'soporte', descripcion: '', tecnico: currentUser?.nombre || '', resultado: '' })
        const resDetalle = await api(`/api/puntos/${puntoId}`)
        if (resDetalle.ok) setPuntoSeleccionado(await resDetalle.json())
        loadPuntos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo registrar la atención')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const abrirAdjuntosEquipo = async (equipoId) => {
    setAdjuntosEquipo([])
    try {
      const res = await api(`/api/adjuntos?tipo=equipo&ref_id=${equipoId}`)
      if (res.ok) {
        const data = await res.json()
        setAdjuntosEquipo(Array.isArray(data) ? data : [])
      }
    } catch { /* sin adjuntos */ }
  }

  const subirAdjuntoEquipo = async (evt, equipoId) => {
    const file = evt.target.files && evt.target.files[0]
    evt.target.value = ''
    if (!file || !equipoId) return
    setAdjuntosUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tipo', 'equipo')
    fd.append('equipo_id', String(equipoId))
    try {
      const res = await api('/api/adjuntos', { method: 'POST', body: fd })
      if (res.ok) {
        showToast('Adjunto subido')
        abrirAdjuntosEquipo(equipoId)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo subir el adjunto')
      }
    } catch {
      showToast('Error conectando con el servidor')
    } finally {
      setAdjuntosUploading(false)
    }
  }

  const borrarAdjunto = async (adjunto, recolector) => {
    if (!window.confirm('¿Eliminar este adjunto?')) return
    try {
      const res = await api(`/api/adjuntos/${adjunto.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Adjunto eliminado')
        recolector()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleFirmarActa = async (e) => {
    e.preventDefault()
    if (!firmaActaForm.nombre || !firmaActaForm.documento) {
      showToast('Nombre y documento son obligatorios')
      return
    }
    if (!selectedActa) return
    setFirmaAplicando(true)
    try {
      const res = await api(`/api/reports/actas/${selectedActa.id}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: firmaActaForm.nombre, documento: firmaActaForm.documento }),
      })
      if (res.ok) {
        const acta = await res.json()
        setSelectedActa((prev) => ({ ...prev, ...acta }))
        setFirmaModalOpen(false)
        setFirmaActaForm({ nombre: '', documento: '' })
        loadActas()
        showToast('Acta firmada y PDF regenerado')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo firmar el acta')
      }
    } catch {
      showToast('Error conectando con el servidor')
    } finally {
      setFirmaAplicando(false)
    }
  }

  const handleDescargarEtiquetas = (ids = null) => {
    const qs = ids && ids.length ? `?ids=${ids.join(',')}` : ''
    downloadViaApi(`/api/inventory/equipos/etiquetas/pdf${qs}`)
  }

  const handleEnviarCorreo = async () => {
    try {
      const res = await api('/api/notificaciones/correo', { method: 'POST' })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.detalle || 'Correo enviado correctamente')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo enviar el correo')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleEnviarWhatsApp = async () => {
    try {
      const res = await api('/api/notificaciones/whatsapp', { method: 'POST' })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        const enviados = data.enviados || []
        showToast(`Resumen enviado por WhatsApp a ${enviados.length} número(s)`)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo enviar por WhatsApp')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }


  useEffect(() => {
    if (isScannerOpen && scannerInputRef.current) {
      scannerInputRef.current.focus()
    }
  }, [isScannerOpen])

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const handleRegisterEntry = async (event) => {
    event.preventDefault()
    if (!entryForm.responsable) {
      showToast('Completa el responsable')
      return
    }

    const lineasValidas = entryItems.filter((l) => l.equipo_id)
    if (!lineasValidas.length) {
      showToast('Agrega al menos un equipo a la entrada')
      return
    }

    const items = []
    let valorTotal = 0
    for (const linea of lineasValidas) {
      const equipo = equipos.find((e) => String(e.id) === String(linea.equipo_id))
      if (!equipo) continue
      const cantidad = Math.max(1, Number(linea.cantidad || 1) || 1)
      const seriales = Array.from({ length: cantidad }, (_, i) => (linea.seriales[i] || '').trim())
      const precioUnit = Number(linea.precio || 0)
      valorTotal += precioUnit * cantidad
      for (let i = 0; i < cantidad; i++) {
        items.push({
          dispositivo: `${equipo.marca} ${equipo.modelo}`.trim(),
          marca: equipo.marca,
          detalle: `Folio: ${equipo.folio}`,
          cantidad: 1,
          serial: seriales[i] || equipo.serie || 'S/N',
          equipo_id: equipo.id,
        })
      }
    }
    if (!items.length) {
      showToast('No se pudo armar la entrada (equipos no encontrados)')
      return
    }

    try {
      const res = await api(`/api/reports/actas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ENTRADA',
          entregado_por: entryForm.responsable,
          observaciones: entryForm.ubicacion || '',
          cajas: Math.max(1, Number(entryForm.cajas || 1) || 1),
          valor_aprox: valorTotal > 0 ? Number(valorTotal.toFixed(2)) : null,
          email_destino: entryForm.email || null,
          items,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        await subirFotosActa(created.id, entryPhotos)
        showToast(`Entrada registrada (Acta ${created.numero}) con ${items.length} equipo(s)`)
        loadActas()
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo registrar la entrada')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }

    setEntryForm({ responsable: '', ubicacion: '', cajas: '1', email: '' })
    setEntryItems([{ equipo_id: '', cantidad: '1', precio: '', seriales: [''] }])
    setEntryPhotos([])
  }

  const handleNewExit = async (event) => {
    event.preventDefault()
    if (!exitForm.responsable) {
      showToast('Completa responsable')
      return
    }
    const destino = exitForm.destino === '__otra__' ? exitForm.destino_otro : exitForm.destino
    if (!destino) {
      showToast('Completa el destino del equipo')
      return
    }

    const lineasValidas = exitItems.filter((l) => l.equipo_id)
    if (!lineasValidas.length) {
      showToast('Agrega al menos un equipo a la salida')
      return
    }

    const items = []
    for (const linea of lineasValidas) {
      const equipo = equipos.find((e) => String(e.id) === String(linea.equipo_id))
      if (!equipo) continue
      const cantidad = Math.max(1, Number(linea.cantidad || 1) || 1)
      const seriales = Array.from({ length: cantidad }, (_, i) => (linea.seriales[i] || '').trim())
      for (let i = 0; i < cantidad; i++) {
        items.push({
          dispositivo: `${equipo.marca} ${equipo.modelo}`.trim(),
          marca: equipo.marca,
          detalle: `Folio: ${equipo.folio}`,
          cantidad: 1,
          serial: seriales[i] || equipo.serie || 'S/N',
          equipo_id: equipo.id,
        })
      }
    }
    if (!items.length) {
      showToast('No se pudo armar la salida (equipos no encontrados)')
      return
    }

    try {
      const res = await api(`/api/reports/actas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'SALIDA',
          entregado_por: exitForm.responsable,
          proyecto: destino,
          email_destino: exitForm.email || null,
          items,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        await subirFotosActa(created.id, exitPhotos)
        showToast(`Salida registrada (Acta ${created.numero}) con ${items.length} equipo(s)`)
        loadActas()
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo registrar la salida')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }

    setExitForm({ responsable: '', destino: '', destino_otro: '', email: '' })
    setExitItems([{ equipo_id: '', cantidad: '1', seriales: [''] }])
    setExitPhotos([])
  }

  const handleOpenActaById = async (acta) => {
    try {
      const res = await api(`/api/reports/actas/${acta.id}`)
      if (res.ok) {
        const fullActa = await res.json()
        setSelectedActa(fullActa)
      } else {
        setSelectedActa(acta)
      }
    } catch {
      setSelectedActa(acta)
    }
    setIsViewModalOpen(true)
  }

  const handleOpenActaPDF = (actaId) => {
    openViaApi(`/api/reports/actas/${actaId}/pdf`)
    showToast('Abriendo PDF oficial del acta')
  }

  const handleOpenActa = () => {
    if (actas && actas.length > 0) {
      handleOpenActaById(actas[0])
    } else {
      openViaApi('/api/reports/acta/latest')
    }
    showToast('Cargando acta oficial')
  }

  const handleExportReport = () => {
    setReportCount((current) => current + 1)
    handleOpenActa()
  }

  const handleSaveConfig = () => {
    setConfigSaved(true)
    try {
      localStorage.setItem('inv_app_settings', JSON.stringify(appSettings))
      localStorage.setItem(
        'inventario_config',
        JSON.stringify({ guardada: new Date().toISOString(), usuario: currentUser?.correo || '' })
      )
    } catch { /* ignore */ }
    setTimeout(() => setConfigSaved(false), 2500)
    showToast('Configuración guardada')
  }

  const handleQuickStatusChange = async (equipoId, nuevoEstado) => {
    try {
      const res = await api(`/api/inventory/equipos/${equipoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        showToast(`Equipo actualizado a ${nuevoEstado}`)
        loadEquipos()
      } else {
        setEquipos((curr) => curr.map((e) => (e.id === equipoId ? { ...e, estado: nuevoEstado } : e)))
        showToast(`Equipo marcado como ${nuevoEstado}`)
      }
    } catch {
      setEquipos((curr) => curr.map((e) => (e.id === equipoId ? { ...e, estado: nuevoEstado } : e)))
      showToast(`Equipo marcado como ${nuevoEstado}`)
    }
  }

  const handleIncludeInActa = (equipo) => {
    setCreateActaForm((prev) => ({
      ...prev,
      items: [
        ...prev.items.filter((it) => it.dispositivo),
        {
          dispositivo: `${equipo.marca} ${equipo.modelo}`,
          marca: equipo.marca,
          detalle: `Folio: ${equipo.folio} | Ubic: ${equipo.ubicacion || 'Bodega'}`,
          cantidad: 1,
          serial: equipo.serie || 'S/N',
          equipo_id: equipo.id,
        },
      ],
    }))
    setIsCreateModalOpen(true)
    showToast(`Equipo ${equipo.folio} añadido a la orden de acta`)
  }

  const handleCreateActaSubmit = async (e) => {
    e.preventDefault()
    if (!createActaForm.entregado_por) {
      showToast('Ingresa quién autoriza / entrega el acta')
      return
    }
    const validItems = createActaForm.items.filter((it) => it.dispositivo.trim())
    if (validItems.length === 0) {
      showToast('Agrega al menos un dispositivo al acta')
      return
    }

    const payload = {
      tipo: createActaForm.tipo,
      entregado_por: createActaForm.entregado_por,
      proyecto: createActaForm.proyecto || 'Operación General',
      responsable_destino: createActaForm.responsable_destino || 'Responsable en Destino',
      ciudad_destino: createActaForm.ciudad_destino || 'Bogotá',
      direccion_destino: createActaForm.direccion_destino || 'Sede Destino',
      observaciones: createActaForm.observaciones || '',
      valor_aprox: createActaForm.valor_aprox ? parseFloat(createActaForm.valor_aprox) : null,
      cajas: parseInt(createActaForm.cajas || 1, 10),
      items: validItems.map((it) => ({
        dispositivo: it.dispositivo,
        marca: it.marca || '',
        detalle: it.detalle || '',
        cantidad: parseInt(it.cantidad || 1, 10),
        serial: it.serial || '',
        equipo_id: it.equipo_id || null,
      })),
    }

    try {
      const res = await api(`/api/reports/actas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const created = await res.json()
        await subirFotosActa(created.id, createActaForm.fotos || [])
        showToast(`Acta ${created.numero} generada con éxito`)
        setCreateActaForm((f) => ({ ...f, fotos: [] }))
        setIsCreateModalOpen(false)
        loadActas()
        handleOpenActaById(created)
      } else {
        const err = await res.json()
        showToast(`Error: ${err.detail || 'No se pudo generar el acta'}`)
      }
    } catch {
      showToast('Error conectando con el backend al generar el acta')
    }
  }

  const handleEquipmentSubmit = async (event) => {
    event.preventDefault()
    if (!equipmentForm.marca || !equipmentForm.modelo) {
      showToast('Completa marca y modelo')
      return
    }
    if (!equipmentForm.serie?.trim()) {
      showToast('El número de serie es obligatorio para cada equipo')
      return
    }

    const payload = {
      marca: equipmentForm.marca,
      modelo: equipmentForm.modelo,
      serie: equipmentForm.serie || null,
      ubicacion: equipmentForm.ubicacion || 'Bodega Central',
      estado: equipmentForm.estado,
      categoria_id: equipmentForm.categoria_id ? Number(equipmentForm.categoria_id) : null,
      ubicacion_id: equipmentForm.ubicacion_id ? Number(equipmentForm.ubicacion_id) : null,
      valor_aprox: equipmentForm.valor_aprox ? parseFloat(equipmentForm.valor_aprox) : null,
      observaciones: equipmentForm.observaciones || '',
    }
    if (editingEquipmentId) payload.folio = equipmentForm.folio

    const editing = editingEquipmentId

    try {
      const res = editing
        ? await api(`/api/inventory/equipos/${editing}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await api(`/api/inventory/equipos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (res.ok) {
        const savedData = await res.json()
        const targetId = editing || savedData.id
        if (equipmentPhotoFile && targetId) {
          try {
            const formData = new FormData()
            formData.append('file', equipmentPhotoFile)
            await fetch(`${API_BASE}/api/inventory/equipos/${targetId}/foto`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })
          } catch {
            showToast('Equipo guardado, pero falló la subida de la foto')
          }
        }
        showToast(editing ? 'Equipo actualizado en la base de datos' : 'Equipo guardado en la base de datos')
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        if (editing) {
          showToast(err.detail || 'No se pudo actualizar el equipo')
          return
        }
        const nuevo = { id: Date.now(), ...payload }
        setEquipos((current) => [nuevo, ...current])
        showToast(err.detail || 'Equipo agregado al inventario')
      }
    } catch {
      if (!editing) {
        const nuevo = { id: Date.now(), ...payload }
        setEquipos((current) => [nuevo, ...current])
        showToast('Equipo agregado a inventario')
      } else {
        showToast('No se pudo conectar con el servidor')
      }
    }

    setEditingEquipmentId(null)
    setEquipmentPhotoFile(null)
    setEquipmentPhotoPreview('')
    setEquipmentForm({
      folio: '',
      marca: '',
      modelo: '',
      serie: '',
      ubicacion: '',
      estado: 'disponible',
      categoria_id: '',
      ubicacion_id: '',
      valor_aprox: '',
      observaciones: '',
    })
  }

  const handleEditEquipment = (equipo) => {
    setEditingEquipmentId(equipo.id)
    setEquipmentPhotoFile(null)
    setEquipmentPhotoPreview(equipo.foto ? `${API_BASE}${equipo.foto}` : '')
    setEquipmentForm({
      folio: equipo.folio || '',
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      serie: equipo.serie || '',
      ubicacion: equipo.ubicacion || '',
      estado: equipo.estado || 'disponible',
      categoria_id: equipo.categoria_id ? String(equipo.categoria_id) : '',
      ubicacion_id: equipo.ubicacion_id ? String(equipo.ubicacion_id) : '',
      valor_aprox: equipo.valor_aprox != null ? String(equipo.valor_aprox) : '',
      observaciones: equipo.observaciones || '',
    })
    const form = document.getElementById('equipment-form')
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' })
    showToast('Editando equipo; usa "Guardar equipo" para confirmar')
  }

  const handleDeleteEquipment = async (equipoId) => {
    try {
      const res = await api(`/api/inventory/equipos/${equipoId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Equipo eliminado')
        setEquipos((current) => current.filter((e) => e.id !== equipoId))
        if (editingEquipmentId === equipoId) {
          setEditingEquipmentId(null)
          setEquipmentPhotoFile(null)
          setEquipmentPhotoPreview('')
          setEquipmentForm({ folio: '', marca: '', modelo: '', serie: '', ubicacion: '', estado: 'disponible', categoria_id: '', ubicacion_id: '', valor_aprox: '', observaciones: '' })
        }
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar el equipo')
      }
    } catch {
      showToast('No se pudo conectar con el servidor')
    }
  }

  const handleDownloadTemplate = () => {
    const url = `${API_BASE}/api/inventory/equipos/plantilla`
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener,noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportFileChange = (event) => {
    const file = event.target.files && event.target.files[0]
    setImportFile(file || null)
    setImportResult(null)
    if (!file) return
    if (!(file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      showToast('Adjunta un archivo .csv o .xlsx')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result || '')
      try {
        const filas = parseImportCSV(text)
        if (!filas.length) {
          setImportResult({ error: 'El archivo no contiene filas válidas' })
          return
        }
        const res = await api('/api/inventory/equipos/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filas),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({ detail: 'Error al importar' }))
          setImportResult({ error: d.detail || 'Error al importar' })
          return
        }
        const data = await res.json()
        setImportResult(data)
        loadEquipos()
        loadStats()
        showToast(`Importación finalizada: ${data.creados} equipos creados`)
      } catch (e) {
        setImportResult({ error: e.message || 'Error al procesar el archivo' })
      }
    }
    reader.readAsText(file)
  }

  const toggleStockSelect = (id) => {
    setStockSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleBulkEdit = async (action) => {
    if (!stockSelected.length) {
      showToast('Selecciona al menos un equipo')
      return
    }
    const body = { ids: stockSelected }
    if (action.tipo === 'estado') body.estado = action.valor
    if (action.tipo === 'ubicacion') {
      const loc = ubicaciones.find((u) => String(u.id) === String(action.valor))
      if (loc) body.ubicacion_id = loc.id
      else body.ubicacion = action.valor
    }
    setBulkProcessing(true)
    try {
      const res = await api('/api/inventory/equipos/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ detail: 'Error' }))
        showToast(d.detail || 'Error al aplicar cambios')
      } else {
        const data = await res.json()
        showToast(`Cambios aplicados a ${data.actualizados} equipo(s)`)
        setStockSelected([])
        setBulkAction({ tipo: '', valor: '' })
        loadEquipos()
        loadStats()
      }
    } catch (e) {
      showToast(e.message || 'Error al aplicar cambios')
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleAddEquipment = async () => {
    setEditingEquipmentId(null)
    setEquipmentPhotoFile(null)
    setEquipmentPhotoPreview('')
    setEquipmentForm({
      folio: '',
      marca: '',
      modelo: '',
      serie: '',
      ubicacion: 'Bodega Central',
      estado: 'disponible',
      categoria_id: '',
      ubicacion_id: '',
      valor_aprox: '',
      observaciones: '',
    })
    const form = document.getElementById('equipment-form')
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      const input = form && form.querySelector('input')
      if (input) input.focus()
    }, 300)
  }

  const handleCategoriaSubmit = async (event) => {
    event.preventDefault()
    if (!categoriaForm.nombre) {
      showToast('Ingresa el nombre de la categoría')
      return
    }
    try {
      const res = await api('/api/catalogo/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: categoriaForm.nombre, descripcion: categoriaForm.descripcion }),
      })
      if (res.ok) {
        showToast('Categoría creada')
        setCategoriaForm({ nombre: '', descripcion: '' })
        api('/api/catalogo/categorias')
          .then((r) => r.json())
          .then((data) => { if (Array.isArray(data) && data.length) setCategorias(data) })
          .catch(() => {})
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo crear la categoría')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleUbicacionSubmit = async (event) => {
    event.preventDefault()
    if (!ubicacionForm.nombre) {
      showToast('Ingresa el nombre de la ubicación')
      return
    }
    try {
      const res = await api('/api/catalogo/ubicaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ubicacionForm),
      })
      if (res.ok) {
        showToast('Ubicación creada')
        setUbicacionForm({ nombre: '', ciudad: '', direccion: '' })
        api('/api/catalogo/ubicaciones')
          .then((r) => r.json())
          .then((data) => { if (Array.isArray(data) && data.length) setUbicaciones(data) })
          .catch(() => {})
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo crear la ubicación')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleUsuarioSubmit = async (event) => {
    event.preventDefault()
    if (!usuarioForm.nombre || !usuarioForm.correo) {
      showToast('Completa nombre y correo')
      return
    }
    const editing = editingUsuarioId
    const body = {
      nombre: usuarioForm.nombre,
      correo: usuarioForm.correo,
      rol: usuarioForm.rol,
    }
    if (!editing) body.password = usuarioForm.password || 'inicial123'
    else if (usuarioForm.password) body.password = usuarioForm.password

    try {
      const res = editing
        ? await api(`/api/usuarios/${editing}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await api('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      if (res.ok) {
        showToast(editing ? 'Usuario actualizado' : 'Usuario creado')
        setEditingUsuarioId(null)
        setUsuarioForm({ nombre: '', correo: '', rol: 'operativo', password: '' })
        api('/api/usuarios')
          .then((r) => r.json())
          .then((data) => { if (Array.isArray(data)) setUsuarios(data) })
          .catch(() => {})
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || (editing ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario'))
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleEditUsuario = (usuario) => {
    setEditingUsuarioId(usuario.id)
    setUsuarioForm({ nombre: usuario.nombre || '', correo: usuario.correo || '', rol: usuario.rol || 'operativo', password: '' })
    showToast('Editando usuario; escribe contraseña solo si deseas cambiarla')
  }

  const handleToggleUsuarioEstado = async (id, nuevoActivo) => {
    try {
      const res = await api(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoActivo }),
      })
      if (res.ok) {
        setUsuarios((curr) => curr.map((u) => (u.id === id ? { ...u, activo: nuevoActivo } : u)))
        return true
      }
      const err = await res.json().catch(() => ({}))
      showToast(err.detail || 'No se pudo cambiar el estado del usuario')
      return false
    } catch {
      showToast('No se pudo conectar con el servidor')
      return false
    }
  }

  const handleMantenimientoSubmit = async (event) => {
    event.preventDefault()
    if (!mantenimientoForm.equipo_id) {
      showToast('Selecciona un equipo para el mantenimiento')
      return
    }
    try {
      const res = await api('/api/mantenimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipo_id: mantenimientoForm.equipo_id,
          punto_id: mantenimientoForm.punto_id || null,
          tipo: mantenimientoForm.tipo,
          descripcion: mantenimientoForm.descripcion,
          tecnico: mantenimientoForm.tecnico,
          prioridad: mantenimientoForm.prioridad || 'media',
          fecha_programada: mantenimientoForm.fecha_programada || null,
          piezas: mantenimientoForm.piezas || null,
          periodicidad: mantenimientoForm.periodicidad || null,
          estado: 'programado',
        }),
      })
      if (res.ok) {
        showToast('Mantenimiento programado')
        setMantenimientoForm({ equipo_id: '', equipo_folio: '', punto_id: '', punto_nombre: '', tipo: 'preventivo', descripcion: '', tecnico: '', prioridad: 'media', fecha_programada: '', piezas: '', periodicidad: 'mensual' })
        loadMantenimientos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo programar el mantenimiento')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleMtGrupalSubmit = async (event) => {
    event.preventDefault()
    const lineas = mtGrupalItems
      .filter((it) => it.nombre_equipo.trim())
      .map((it) => ({ nombre_equipo: it.nombre_equipo.trim(), serie: it.serie.trim() || null }))
    if (lineas.length === 0) {
      showToast('Agrega al menos un equipo con su nombre')
      return
    }
    try {
      const res = await api('/api/actas-mantenimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: mtGrupalForm.cliente || null,
          tecnico: mtGrupalForm.tecnico || null,
          prioridad: mtGrupalForm.prioridad || 'media',
          observaciones: mtGrupalForm.observaciones || null,
          items: lineas,
        }),
      })
      if (res.ok) {
        showToast('Acta de mantenimiento creada')
        setMtGrupalForm({ cliente: '', tecnico: '', prioridad: 'media', observaciones: '' })
        setMtGrupalItems([{ nombre_equipo: '', serie: '' }])
        loadActasMt()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo crear el acta de mantenimiento')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleActasMtPdf = async (acta) => {
    try {
      const res = await api(acta.pdf_url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo abrir el PDF')
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      showToast('No se pudo abrir el PDF')
    }
  }

  const handleMantenimientoEstado = async (id, estado) => {
    try {
      const res = await api(`/api/mantenimientos/${id}/estado?estado=${estado}`, { method: 'PATCH' })
      if (res.ok) {
        showToast(`Mantenimiento marcado como ${estado.replace('_', ' ')}`)
        loadMantenimientos()
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo actualizar el estado')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleEliminarMantenimiento = async (item) => {
    if (item.estado === 'finalizado') {
      showToast('No se puede eliminar un mantenimiento finalizado')
      return
    }
    const equipoRef = item.equipo_folio ? ` del equipo ${item.equipo_folio}` : ''
    if (!window.confirm(`¿Eliminar el mantenimiento ${item.id}${equipoRef}?`)) return
    try {
      const res = await api(`/api/mantenimientos/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Mantenimiento eliminado')
        loadMantenimientos()
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar el mantenimiento')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleMtEvidenciaChange = (event, id) => {
    const file = event.target.files && event.target.files[0]
    if (file) {
      setMtEvidenciaFile(file)
      setMtEvidenciaTarget(id)
    }
  }

  const handleMtUploadEvidencia = async () => {
    if (!mtEvidenciaFile || !mtEvidenciaTarget) {
      showToast('Selecciona una imagen de evidencia')
      return
    }
    const formData = new FormData()
    formData.append('file', mtEvidenciaFile)
    try {
      const res = await api(`/api/mantenimientos/${mtEvidenciaTarget}/evidencia`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        showToast('Evidencia subida')
        setMtEvidenciaFile(null)
        setMtEvidenciaTarget(null)
        loadMantenimientos()
        if (data.foto) {
          const el = document.getElementById(`mt-evidencia-${mtEvidenciaTarget}`)
          if (el) el.value = ''
        }
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo subir la evidencia')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleMtVerHistorial = async (equipoId) => {
    try {
      const res = await api(`/api/inventory/equipos/historial/${equipoId}`)
      if (res.ok) {
        const data = await res.json()
        setMtHistorial(Array.isArray(data) ? data : [])
        setMtHistorialEquipo(equipoId)
        setMtHistorialOpen(true)
      } else {
        showToast('No se pudo cargar el historial')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handlePrintMantenimiento = async (id) => {
    try {
      const res = await api(`/api/mantenimientos/${id}/pdf`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo generar el acta PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      showToast('Abriendo acta de mantenimiento (PDF)')
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleMtRepCargar = async (modo) => {
    if (!mtRepDesde || !mtRepHasta) {
      showToast('Selecciona un rango de fechas')
      return
    }
    setMtRepCargando(true)
    try {
      const res = await api(`/api/reports/mantenimiento/por-${modo}?desde=${mtRepDesde}&hasta=${mtRepHasta}`)
      if (res.ok) {
        const data = await res.json()
        setMtRepData(data)
        setMtRepModo(modo)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo cargar el reporte')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }
    setMtRepCargando(false)
  }

  const handleMtRepPdf = async (modo) => {
    if (!mtRepDesde || !mtRepHasta) {
      showToast('Selecciona un rango de fechas')
      return
    }
    try {
      const res = await api(`/api/reports/mantenimiento/por-${modo}/pdf?desde=${mtRepDesde}&hasta=${mtRepHasta}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo generar el PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      showToast('Error conectando con el servidor')
    }
  }

  const handleDeleteCategoria = async (id, nombre) => {
    try {
      const res = await api(`/api/catalogo/categorias/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Categoría eliminada')
        setCategorias((current) => current.filter((c) => c.id !== id))
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar la categoría')
      }
    } catch {
      showToast('No se pudo conectar con el servidor')
    }
  }

  const handleDeleteUbicacion = async (id, nombre) => {
    try {
      const res = await api(`/api/catalogo/ubicaciones/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Ubicación eliminada')
        setUbicaciones((current) => current.filter((u) => u.id !== id))
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar la ubicación')
      }
    } catch {
      showToast('No se pudo conectar con el servidor')
    }
  }

  const handleDeleteUsuario = async (id, nombre) => {
    try {
      const res = await api(`/api/usuarios/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Usuario eliminado')
        setUsuarios((current) => current.filter((u) => u.id !== id))
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo eliminar el usuario')
      }
    } catch {
      showToast('No se pudo conectar con el servidor')
    }
  }

  const handleExportCSV = () => {
    downloadViaApi('/api/reports/exportar/equipos?formato=csv')
    showToast('Exportando equipos a CSV')
  }

  const handleExportXLSX = () => {
    downloadViaApi('/api/reports/exportar/equipos?formato=xlsx')
    showToast('Exportando equipos a Excel')
  }

  const handleExportActasCSV = () => {
    downloadViaApi('/api/reports/exportar/actas?formato=csv')
    showToast('Exportando actas a CSV')
  }

  const handleExportActasXLSX = () => {
    downloadViaApi('/api/reports/exportar/actas?formato=xlsx')
    showToast('Exportando actas a Excel')
  }

  const handleExportMantenimientosCSV = () => {
    downloadViaApi('/api/reports/exportar/mantenimientos?formato=csv')
    showToast('Exportando mantenimientos a CSV')
  }

  const handleExportMantenimientosXLSX = () => {
    downloadViaApi('/api/reports/exportar/mantenimientos?formato=xlsx')
    showToast('Exportando mantenimientos a Excel')
  }

  const handleExportPDFInventarioUbicacion = () => {
    openViaApi('/api/reports/pdf/inventario-por-ubicacion')
    showToast('Generando PDF: inventario por ubicación')
  }

  const handleExportPDFResumenMantenimientos = () => {
    openViaApi('/api/reports/pdf/resumen-mantenimientos')
    showToast('Generando PDF: resumen de mantenimientos')
  }

  const loadDepreciacion = async () => {
    try {
      const res = await api('/api/reports/depreciacion')
      if (res.ok) {
        const data = await res.json()
        setDepreciacion(data)
        showToast('Valor del inventario cargado')
      } else {
        showToast('No se pudo cargar la depreciación')
      }
    } catch {
      showToast('No se pudo conectar con el servidor')
    }
  }

  const renderSectionContent = () => {
    if (activeSection === 'dashboard') {
      const t = stats.totales || {}
      const al = stats.alertas || { vencidas: 0, proximas: 0 }
      const totalEquipos =
        (t.disponibles || 0) + (t.asignados || 0) + (t.reparacion || 0) + (t.baja || 0) + (t.prestamo || 0)
      const pctDisp = totalEquipos ? Math.round(((t.disponibles || 0) / totalEquipos) * 100) : 0

      const pieChart = (label, data) => (
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '1rem' }}>{label}</h3>
          {data.length === 0 ? (
            <p style={{ color: 'var(--text-soft)', margin: 0 }}>Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      stroke="rgba(8, 13, 30, 0.85)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, 'Equipos']}
                  contentStyle={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )

      const estadoData = totalEquipos
        ? ['disponibles', 'asignados', 'reparacion', 'baja', 'prestamo']
            .filter((k) => (t[k] || 0) > 0)
            .map((k) => ({ name: statLabels[k] || k, value: t[k] || 0 }))
        : []
      const categoriaData = (stats.por_categoria || [])
        .map((i) => ({ name: i.categoria || 'Sin categoría', value: i.cantidad || 0 }))
        .filter((d) => d.value > 0)
      const ubicacionData = (stats.por_ubicacion || [])
        .map((i) => ({ name: i.ubicacion || 'Sin ubicación', value: i.cantidad || 0 }))
        .filter((d) => d.value > 0)

      const barChart = (label, items, colorKey) => {
        const max = Math.max(1, ...items.map((i) => i.cantidad || 0))
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{label}</h3>
            {items.length === 0 && <p style={{ color: 'var(--text-soft)', margin: 0 }}>Sin datos aún</p>}
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600 }}>{it.categoria || it.ubicacion}</span>
                  <span style={{ color: 'var(--text-soft)' }}>{it.cantidad}</span>
                </div>
                <div
                  style={{
                    height: '10px',
                    borderRadius: '6px',
                    background: 'var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(4, (it.cantidad / max) * 100)}%`,
                      height: '100%',
                      background: colorKey,
                      borderRadius: '6px',
                      transition: 'width .3s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )
      }

      return (
        <section className="view-grid">
          <div className="mini-grid" style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
            <div className="action-card stock-stat-highlight">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 Disponibles
              </span>
              <strong style={{ fontSize: '2.2rem' }}>{t.disponibles || 0}</strong>
              <small style={{ color: 'var(--success)' }}>{pctDisp}% de disponibilidad operativa</small>
            </div>
            <div className="action-card">
              <span>Asignados</span>
              <strong style={{ fontSize: '2rem' }}>{t.asignados || 0}</strong>
              <small>Equipos en uso</small>
            </div>
            <div className="action-card">
              <span>En Reparación</span>
              <strong style={{ fontSize: '2rem', color: 'var(--warning)' }}>{t.reparacion || 0}</strong>
              <small>Mantenimiento activo</small>
            </div>
            <div className="action-card">
              <span>Préstamo</span>
              <strong style={{ fontSize: '2rem', color: '#fbbf24' }}>{t.prestamo || 0}</strong>
              <small>Equipos en préstamo</small>
            </div>
            <div className="action-card">
              <span>Total en Inventario</span>
              <strong style={{ fontSize: '2rem' }}>{totalEquipos}</strong>
              <small>Equipos registrados</small>
            </div>
          </div>

          <div className="mini-grid" style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
            <div className="action-card highlight">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💰 Valor del inventario
              </span>
              <strong style={{ fontSize: '1.8rem' }}>
                ${Number(stats.valor_total || 0).toLocaleString('es-CO')}
              </strong>
              <small>Valor aproximado total</small>
            </div>
            <div className="action-card">
              <span>Actas del mes ({stats.mes || 'actual'})</span>
              <strong style={{ fontSize: '2rem' }}>{stats.actas_generadas || 0}</strong>
              <small>Entradas y salidas registradas</small>
            </div>
            <div className="action-card">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔧 Mantenimiento activo
              </span>
              <strong style={{ fontSize: '2rem' }}>{stats.mantenimientos_activos || 0}</strong>
              <small>Programados y en proceso</small>
            </div>
            <div
              className="action-card"
              style={{
                background:
                  al.vencidas > 0
                    ? 'linear-gradient(135deg, rgba(220,38,38,.2), rgba(124,58,237,.08))'
                    : 'rgba(34,211,238,0.06)',
              }}
            >
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚠️ Alertas
              </span>
              <strong style={{ fontSize: '1.8rem', color: al.vencidas > 0 ? 'var(--danger)' : 'var(--primary)' }}>
                {al.vencidas} vencida{String(al.vencidas) > '1' ? 's' : ''} · {al.proximas} próx.
              </strong>
              <small>Mantenimientos por atender</small>
            </div>
          </div>

          <article className="panel wide-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-header">
              <div>
                <h2>Distribución del inventario</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                  Equipos agrupados por categoría y ubicación
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                padding: '18px 4px 8px',
              }}
            >
              {barChart('Por categoría', stats.por_categoria || [], 'linear-gradient(90deg,#163f91,#0082FF)')}
              {barChart('Por ubicación', stats.por_ubicacion || [], 'linear-gradient(90deg,#16a34a,#163f91)')}
            </div>
          </article>

          <article className="panel wide-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-header">
              <div>
                <h2>Gráficas de pastel</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                  Porcentaje del inventario por estado, categoría y ubicación
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                padding: '18px 4px 8px',
              }}
            >
              {pieChart('Por estado', estadoData)}
              {pieChart('Por categoría', categoriaData)}
              {pieChart('Por ubicación', ubicacionData)}
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'stock') {
      const equiposDisponibles = equipos.filter((e) => e.estado === 'disponible').length
      const equiposAsignados = equipos.filter((e) => e.estado === 'asignado').length
      const equiposReparacion = equipos.filter((e) => e.estado === 'reparacion').length
      const totalEquipos = equipos.length
      const pctDisp = totalEquipos ? Math.round((equiposDisponibles / totalEquipos) * 100) : 0

      const filteredEquipos = equipos.filter((item) => {
        if (stockFilterOnlyAvailable && item.estado !== 'disponible') return false
        if (stockStatusFilter !== 'todos' && item.estado !== stockStatusFilter) return false
        if (stockCategoryFilter !== 'todas' && (item.categoria_nombre || '') !== stockCategoryFilter) return false
        if (stockLocationFilter !== 'todas' && (item.ubicacion_nombre || item.ubicacion || '') !== stockLocationFilter) return false
        if (stockSearchQuery.trim()) {
          const q = stockSearchQuery.toLowerCase()
          const matchFolio = (item.folio || '').toLowerCase().includes(q)
          const matchMarca = (item.marca || '').toLowerCase().includes(q)
          const matchModelo = (item.modelo || '').toLowerCase().includes(q)
          const matchSerie = (item.serie || '').toLowerCase().includes(q)
          const matchObs = (item.observaciones || '').toLowerCase().includes(q)
          if (!matchFolio && !matchMarca && !matchModelo && !matchSerie && !matchObs) return false
        }
        return true
      })

      // Ordenamiento por columna.
      const sortedEquipos = [...filteredEquipos].sort((a, b) => {
        let va = a[stockSortKey] != null ? a[stockSortKey] : a.folio
        let vb = b[stockSortKey] != null ? b[stockSortKey] : b.folio
        if (stockSortKey === 'estado') { va = a.estado || ''; vb = b.estado || '' }
        if (stockSortKey === 'categoria_nombre') { va = a.categoria_nombre || 'General'; vb = b.categoria_nombre || 'General' }
        if (typeof va === 'number' && typeof vb === 'number') {
          return stockSortDir === 'asc' ? va - vb : vb - va
        }
        return stockSortDir === 'asc'
          ? String(va).localeCompare(String(vb), 'es')
          : String(vb).localeCompare(String(va), 'es')
      })

      // Paginación.
      const totalPages = Math.max(1, Math.ceil(sortedEquipos.length / STOCK_PAGE_SIZE))
      const safePage = Math.min(stockPage, totalPages)
      const pageEquipos = sortedEquipos.slice((safePage - 1) * STOCK_PAGE_SIZE, safePage * STOCK_PAGE_SIZE)

      const toggleStockSort = (key) => {
        if (stockSortKey === key) {
          setStockSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
          setStockSortKey(key)
          setStockSortDir('asc')
        }
        setStockPage(1)
      }

      return (
        <section className="view-grid">
          <div className="mini-grid" style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
            <div className="action-card stock-stat-highlight">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 En Stock (Disponibles)
              </span>
              <strong style={{ fontSize: '2.2rem' }}>{equiposDisponibles}</strong>
              <small style={{ color: 'var(--success)' }}>{pctDisp}% de disponibilidad operativa</small>
            </div>
            <div className="action-card">
              <span>Asignados en Operación</span>
              <strong style={{ fontSize: '2rem' }}>{equiposAsignados}</strong>
              <small>Equipos en uso por usuarios</small>
            </div>
            <div className="action-card">
              <span>En Reparación / Taller</span>
              <strong style={{ fontSize: '2rem', color: 'var(--warning)' }}>{equiposReparacion}</strong>
              <small>Mantenimiento técnico activo</small>
            </div>
            <div className="action-card">
              <span>Total en Inventario</span>
              <strong style={{ fontSize: '2rem' }}>{totalEquipos}</strong>
              <small>Equipos registrados en el sistema</small>
            </div>
          </div>

          <article className="panel wide-panel">
            <div className="panel-header">
              <div>
                <h2>Control de Stock de Equipos</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                  Visualiza los equipos en bodega listos para entrega y gestiona su estado
                </p>
              </div>
              <div className="header-actions">
                {canModify && (
                  <button type="button" className="btn-primary small" onClick={() => setIsCreateModalOpen(true)}>
                    + Emitir Acta con Stock
                  </button>
                )}
              </div>
            </div>

            <div className="stock-toolbar">
              <div className="stock-filters-left">
                <button
                  type="button"
                  className={`filter-pill ${stockFilterOnlyAvailable ? 'active' : ''}`}
                  onClick={() => setStockFilterOnlyAvailable(!stockFilterOnlyAvailable)}
                >
                  <Icon name="box" />
                  <span>Solo Disponibles / En Stock</span>
                  {stockFilterOnlyAvailable && <Icon name="check" />}
                </button>
                <button
                  type="button"
                  className="mobile-filter-btn"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <Icon name="search" /> Filtros
                </button>
                <select
                  className="filter-select"
                  value={stockCategoryFilter}
                  onChange={(e) => setStockCategoryFilter(e.target.value)}
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={stockLocationFilter}
                  onChange={(e) => setStockLocationFilter(e.target.value)}
                >
                  <option value="todas">Todas las ubicaciones</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="disponible">Disponible</option>
                  <option value="asignado">Asignado</option>
                  <option value="reparacion">En reparación</option>
                  <option value="prestamo">Préstamo</option>
                  <option value="baja">Baja</option>
                </select>

                {(stockFilterOnlyAvailable || stockCategoryFilter !== 'todas' || stockLocationFilter !== 'todas' || stockStatusFilter !== 'todos' || stockSearchQuery) && (
                  <button
                    type="button"
                    className="link-button"
                    style={{ fontSize: '0.8rem', color: 'var(--danger)' }}
                    onClick={() => {
                      setStockFilterOnlyAvailable(false)
                      setStockCategoryFilter('todas')
                      setStockLocationFilter('todas')
                      setStockStatusFilter('todos')
                      setStockSearchQuery('')
                    }}
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>

              <div className="search-wrap">
                <span className="search-icon"><Icon name="search" /></span>
                <input
                  placeholder="Buscar folio, marca, modelo, serie..."
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {canModify && (
              <div
                className="stock-bulk-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--card, rgba(255,255,255,.02))',
                  marginBottom: '12px',
                }}
              >
                <span className="filter-pill" style={{ cursor: 'default' }}>
                  <span>
                    {stockSelected.length} seleccionado{String(stockSelected.length) > '1' ? 's' : ''}
                  </span>
                </span>
                <select
                  className="filter-select"
                  style={{ width: '170px' }}
                  value={bulkAction.tipo === 'estado' ? bulkAction.valor : ''}
                  onChange={(e) => setBulkAction({ tipo: 'estado', valor: e.target.value })}
                >
                  <option value="">Cambiar estado…</option>
                  <option value="disponible">Disponible</option>
                  <option value="asignado">Asignado</option>
                  <option value="reparacion">En reparación</option>
                  <option value="prestamo">Préstamo</option>
                  <option value="baja">Baja</option>
                </select>
                <select
                  className="filter-select"
                  style={{ width: '180px' }}
                  value={bulkAction.tipo === 'ubicacion' ? bulkAction.valor : ''}
                  onChange={(e) => setBulkAction({ tipo: 'ubicacion', valor: e.target.value })}
                >
                  <option value="">Mover a ubicación…</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.nombre}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-primary small"
                  disabled={bulkProcessing || !stockSelected.length || !bulkAction.valor}
                  onClick={() => handleBulkEdit(bulkAction)}
                >
                  {bulkProcessing ? 'Aplicando…' : 'Aplicar a seleccionados'}
                </button>
                {stockSelected.length > 0 && (
                  <button
                    type="button"
                    className="link-button"
                    style={{ fontSize: '0.8rem', color: 'var(--danger)' }}
                    onClick={() => setStockSelected([])}
                  >
                    Limpiar selección
                  </button>
                )}
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '36px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={
                          pageEquipos.length > 0 &&
                          pageEquipos.every((i) => stockSelected.includes(i.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStockSelected((prev) => {
                              const all = new Set([...prev, ...pageEquipos.map((i) => i.id)])
                              return [...all]
                            })
                          } else {
                            const ids = new Set(pageEquipos.map((i) => i.id))
                            setStockSelected((prev) => prev.filter((x) => !ids.has(x)))
                          }
                        }}
                      />
                    </th>
                    {[
                      ['folio', 'Folio'],
                      ['marca', 'Equipo / Marca'],
                      ['serie', 'N° Serie'],
                      ['categoria_nombre', 'Categoría'],
                      ['ubicacion_nombre', 'Ubicación'],
                      ['valor_aprox', 'Valor Aprox.'],
                      ['estado', 'Estado'],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleStockSort(key)}
                      >
                        {label}{' '}
                        {stockSortKey === key ? (stockSortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </th>
                    ))}
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEquipos.length ? (
                    pageEquipos.map((item) => (
                      <tr key={item.id}>
                        <td data-label="✅ Seleccionar" style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={stockSelected.includes(item.id)}
                            onChange={() => toggleStockSelect(item.id)}
                          />
                        </td>
                        <td data-label="🆔 Folio">
                          <span className="badge-numero">{item.folio}</span>
                        </td>
                        <td data-label="💻 Equipo / Marca">
                          <div className="equipment-cell">
                            <div className="equipment-avatar">
                              {item.foto ? (
                                <img src={`${API_BASE}${item.foto}`} alt="" className="equipment-avatar-img" />
                              ) : (
                                <span style={{ fontSize: '0.9rem' }}>📦</span>
                              )}
                            </div>
                            <div>
                              <strong>{item.marca}</strong> {item.modelo}
                            </div>
                          </div>
                        </td>
                        <td data-label="🔢 N° Serie">
                          <code style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                            {item.serie || 'S/N'}
                          </code>
                        </td>
                        <td data-label="🏷️ Categoría">
                          <span className="chip" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                            {item.categoria_nombre || 'General'}
                          </span>
                        </td>
                        <td data-label="📍 Ubicación">{item.ubicacion_nombre || item.ubicacion || 'Bodega Central'}</td>
                        <td data-label="💰 Valor Aprox.">
                          {item.valor_aprox
                            ? `$ ${Number(item.valor_aprox).toLocaleString('es-CO')}`
                            : '—'}
                        </td>
                        <td data-label="🚥 Estado">
                          <span className={`status-pill ${item.estado}`}>
                            {item.estado === 'disponible' ? 'En Stock' : item.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td data-label="⚙️ Acciones">
                          <div className="action-btns">
                            <button
                              type="button"
                              className="btn-quick-status"
                              title="Ver detalle completo e historial"
                              onClick={() => handleOpenEquipmentDetail(item)}
                            >
                              Detalle
                            </button>
                            <button
                              type="button"
                              className="btn-quick-status"
                              title="Ver código QR del equipo"
                              onClick={() => {
                                const url = `${API_BASE}/api/inventory/equipos/${item.id}/qr`
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }}
                            >
                              QR
                            </button>
                            {canModify ? (
                              <>
                                {item.estado !== 'disponible' ? (
                                  <button
                                    type="button"
                                    className="btn-quick-status"
                                    title="Pasar a Disponible en Stock"
                                    onClick={() => handleQuickStatusChange(item.id, 'disponible')}
                                  >
                                    Pasar a Stock
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-quick-status"
                                    title="Marcar como Asignado"
                                    onClick={() => handleQuickStatusChange(item.id, 'asignado')}
                                  >
                                    Asignar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-acta-view"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  title="Generar Acta con este equipo"
                                  onClick={() => handleIncludeInActa(item)}
                                >
                                  + Acta
                                </button>
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-soft)', fontSize: '0.8rem' }}>Solo lectura</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-row">
                        No se encontraron equipos con los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {sortedEquipos.length > STOCK_PAGE_SIZE && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 4px 4px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                    Mostrando {pageEquipos.length} de {sortedEquipos.length} equipos
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-quick-status"
                      style={{ padding: '5px 12px' }}
                      disabled={safePage <= 1}
                      onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                    >
                      ← Anterior
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                      Página {safePage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn-quick-status"
                      style={{ padding: '5px 12px' }}
                      disabled={safePage >= totalPages}
                      onClick={() => setStockPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'historial') {
      const totalSalidas = actas.filter((a) => a.tipo === 'SALIDA').length
      const totalEntradas = actas.filter((a) => a.tipo === 'ENTRADA').length
      const totalValor = actas.reduce((acc, a) => acc + (Number(a.valor_aprox) || 0), 0)

      const filteredActas = actas.filter((acta) => {
        if (historialTipoFilter !== 'todos' && acta.tipo !== historialTipoFilter) return false
        if (historialSearchQuery.trim()) {
          const q = historialSearchQuery.toLowerCase()
          const matchNum = (acta.numero || '').toLowerCase().includes(q)
          const matchEnt = (acta.entregado_por || '').toLowerCase().includes(q)
          const matchProy = (acta.proyecto || '').toLowerCase().includes(q)
          const matchResp = (acta.responsable_destino || '').toLowerCase().includes(q)
          const matchCiu = (acta.ciudad_destino || '').toLowerCase().includes(q)
          if (!matchNum && !matchEnt && !matchProy && !matchResp && !matchCiu) return false
        }
        return true
      })

      return (
        <section className="view-grid">
          <div className="mini-grid" style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
            <div className="action-card highlight">
              <span>Total Actas Emitidas</span>
              <strong style={{ fontSize: '2.2rem' }}>{actas.length}</strong>
              <small>Documentos oficiales registrados</small>
            </div>
            <div className="action-card">
              <span>Órdenes de Salida</span>
              <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>{totalSalidas}</strong>
              <small>Despachos y asignaciones</small>
            </div>
            <div className="action-card">
              <span>Órdenes de Entrada</span>
              <strong style={{ fontSize: '2rem', color: 'var(--success)' }}>{totalEntradas}</strong>
              <small>Reingresos y compras</small>
            </div>
            <div className="action-card">
              <span>Valor Total Despachado</span>
              <strong style={{ fontSize: '1.7rem' }}>
                $ {totalValor ? totalValor.toLocaleString('es-CO') : '0'}
              </strong>
              <small>Valor asegurado en actas</small>
            </div>
          </div>

          <article className="panel wide-panel">
            <div className="panel-header">
              <div>
                <h2>Historial de Actas y Movimientos</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                  Consulta todas las órdenes emitidas, visualiza el documento oficial o descarga el PDF
                </p>
              </div>
              <div className="header-actions">
                {canModify && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    + Nueva Acta Oficial
                  </button>
                )}
              </div>
            </div>

            <div className="stock-toolbar">
              <div className="stock-filters-left">
                <button
                  type="button"
                  className={`filter-pill ${historialTipoFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setHistorialTipoFilter('todos')}
                >
                  Todas ({actas.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${historialTipoFilter === 'SALIDA' ? 'active' : ''}`}
                  onClick={() => setHistorialTipoFilter('SALIDA')}
                >
                  Solo Salidas ({totalSalidas})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${historialTipoFilter === 'ENTRADA' ? 'active' : ''}`}
                  onClick={() => setHistorialTipoFilter('ENTRADA')}
                >
                  Solo Entradas ({totalEntradas})
                </button>
              </div>

              <div className="search-wrap">
                <span className="search-icon"><Icon name="search" /></span>
                <input
                  placeholder="Buscar por N° acta, proyecto, destino..."
                  value={historialSearchQuery}
                  onChange={(e) => setHistorialSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N° Acta</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Autorizado / Entregado por</th>
                    <th>Proyecto & Destino</th>
                    <th>Responsable Destino</th>
                    <th>Dispositivos</th>
                    <th>Valor Aprox.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActas.length ? (
                    filteredActas.map((acta) => (
                      <tr key={acta.id}>
                        <td data-label="N° Acta">
                          <span className="badge-numero">{acta.numero}</span>
                        </td>
                        <td data-label="Tipo">
                          <span className={acta.tipo === 'SALIDA' ? 'badge-salida' : 'badge-entrada'}>
                            {acta.tipo}
                          </span>
                        </td>
                        <td data-label="Fecha" style={{ fontSize: '0.85rem' }}>
                          {acta.created_at
                            ? new Date(acta.created_at).toLocaleString('es-CO', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                        <td data-label="Autorizado / Entregado por">
                          <strong>{acta.entregado_por}</strong>
                        </td>
                        <td data-label="Proyecto & Destino">
                          <div>{acta.proyecto || 'General'}</div>
                          <small style={{ color: 'var(--text-soft)' }}>
                            {acta.ciudad_destino ? `${acta.ciudad_destino} - ${acta.direccion_destino || ''}` : '—'}
                          </small>
                        </td>
                        <td data-label="Responsable Destino">{acta.responsable_destino || '—'}</td>
                        <td data-label="Dispositivos">
                          <span className="chip" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                            {acta.items_count || acta.items?.length || 1} equipos • {acta.cajas || 1} caja(s)
                          </span>
                        </td>
                        <td data-label="Valor Aprox.">
                          {acta.valor_aprox
                            ? `$ ${Number(acta.valor_aprox).toLocaleString('es-CO')}`
                            : '—'}
                        </td>
                        <td data-label="Acciones">
                          <div className="action-btns">
                            <button
                              type="button"
                              className="btn-acta-view"
                              onClick={() => handleOpenActaById(acta)}
                              title="Ver detalle del acta oficial"
                            >
                              <Icon name="eye" /> Ver acta
                            </button>
                            <button
                              type="button"
                              className="btn-acta-pdf"
                              onClick={() => handleOpenActaPDF(acta.id)}
                              title="Abrir PDF oficial en nueva pestaña"
                            >
                              <Icon name="fileText" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-row">
                        No hay actas que coincidan con la búsqueda. Puedes emitir una con el botón "+ Nueva Acta Oficial".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'equipos') {
      return (
        <section className="view-grid">
          <article className="panel wide-panel">
            <div className="panel-header">
              <h2>Listado de equipos</h2>
              <div className="header-actions">
                {canModify && (
                  <button type="button" className="btn-primary small" onClick={handleAddEquipment}>
                    Agregar equipo
                  </button>
                )}
                {canModify && (
                  <>
                    <button type="button" className="btn-quick-status" onClick={handleDownloadTemplate}>
                      Descargar plantilla
                    </button>
                    <button type="button" className="btn-quick-status" onClick={() => importInputRef.current && importInputRef.current.click()}>
                      Importar (CSV)
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      style={{ display: 'none' }}
                      onChange={handleImportFileChange}
                    />
                    <button type="button" className="btn-quick-status" onClick={() => handleDescargarEtiquetas()}>
                      🖨 Etiquetas QR (PDF)
                    </button>
                  </>
                )}
                <button type="button" className="link-button" onClick={() => setActiveSection('dashboard')}>
                  Volver al dashboard
                </button>
              </div>
            </div>

            {importResult && (
              <div
                className="seed-banner"
                style={{
                  borderColor: importResult.error ? 'var(--danger)' : 'var(--success)',
                  background: importResult.error ? 'rgba(220,38,38,.08)' : 'rgba(34,197,94,.08)',
                }}
              >
                <div className="seed-banner-text">
                  <h4>
                    {importResult.error ? '✗ Error al importar' : `✓ Importación completada (${importResult.creados} creados)`}
                  </h4>
                  <p>
                    {importResult.error
                      ? importResult.error
                      : importResult.errores && importResult.errores.length
                        ? `${importResult.errores.length} fila(s) con errores: ${
                            importResult.errores.map((e) => `fila ${e.fila} (${e.error})`).join('; ')
                          }`
                        : 'Todos los equipos del archivo fueron creados correctamente.'}
                  </p>
                </div>
              </div>
            )}

            {categorias.length === 0 && canModify && (
              <div className="seed-banner">
                <div className="seed-banner-text">
                  <h4>✨ Catálogos del sistema vacíos</h4>
                  <p>¿Es tu primera vez iniciando? Puedes autogenerar categorías (Cómputo, Redes, Impresión...) y ubicaciones sugeridas con un solo clic.</p>
                </div>
                <button type="button" className="btn-primary small" onClick={handleSeedCatalogos}>
                  Cargar Catálogos Iniciales
                </button>
              </div>
            )}

            {canModify ? (
            <form className="form-grid" id="equipment-form" onSubmit={handleEquipmentSubmit}>
              <label>
                <span>Marca</span>
                <input
                  value={equipmentForm.marca}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, marca: event.target.value })}
                  placeholder="Dell"
                  required
                />
              </label>
              <label>
                <span>Modelo</span>
                <input
                  value={equipmentForm.modelo}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, modelo: event.target.value })}
                  placeholder="Latitude 5440"
                />
              </label>
              <label>
                <span>Número de serie <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>*</span></span>
                <input
                  value={equipmentForm.serie}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, serie: event.target.value })}
                  placeholder="SN-123456"
                  required
                />
              </label>
              <label>
                <span>Ubicación</span>
                <input
                  value={equipmentForm.ubicacion}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, ubicacion: event.target.value })}
                  placeholder="Oficina central"
                />
              </label>
              <label>
                <span>Estado</span>
                <select
                  value={equipmentForm.estado}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, estado: event.target.value })}
                >
                  <option value="disponible">Disponible</option>
                  <option value="asignado">Asignado</option>
                  <option value="reparacion">En reparación</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
              <label>
                <span>Categoría</span>
                <select
                  value={equipmentForm.categoria_id}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, categoria_id: event.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Ubicación asignada</span>
                <select
                  value={equipmentForm.ubicacion_id}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, ubicacion_id: event.target.value })}
                >
                  <option value="">Sin ubicación</option>
                  {ubicaciones.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Valor aproximado</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={equipmentForm.valor_aprox}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, valor_aprox: event.target.value })}
                  placeholder="Ej: 2500000"
                />
              </label>
              <label>
                <span>Observaciones</span>
                <input
                  value={equipmentForm.observaciones}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, observaciones: event.target.value })}
                  placeholder="Notas adicionales"
                />
              </label>

              <label className="photo-upload-label">
                <span>Fotografía del equipo (opcional)</span>
                <div className="photo-upload-box">
                  {equipmentPhotoPreview ? (
                    <div className="photo-preview-wrap">
                      <img src={equipmentPhotoPreview} alt="Previsualización" className="photo-preview-img" />
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEquipmentPhotoFile(null)
                          setEquipmentPhotoPreview('')
                        }}
                      >
                        ✕ Quitar foto
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder">
                      <span style={{ fontSize: '1.4rem' }}>📷</span>
                      <span>Haz clic para seleccionar o cambiar fotografía (JPG, PNG, WEBP)</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setEquipmentPhotoFile(file)
                        setEquipmentPhotoPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </div>
              </label>

              <p style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-soft)', margin: '0' }}>
                📌 El folio se asigna automáticamente (EQ-####). No es necesario ingresarlo.
              </p>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingEquipmentId ? 'Guardar cambios' : 'Guardar equipo'}
                </button>
                {editingEquipmentId && (
                  <button
                    type="button"
                    className="btn-link-danger"
                    onClick={() => {
                      setEditingEquipmentId(null)
                      setEquipmentPhotoFile(null)
                      setEquipmentPhotoPreview('')
                      setEquipmentForm({ folio: '', marca: '', modelo: '', serie: '', ubicacion: '', estado: 'disponible', categoria_id: '', ubicacion_id: '', valor_aprox: '', observaciones: '' })
                    }}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Tu rol ({currentUser?.rol}) es de solo lectura. Contacta a un administrador o supervisor
                para crear o modificar equipos.
              </p>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Equipo</th>
                    <th>N° Serie</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.length ? (
                    equipos.map((equipo) => (
                      <tr key={equipo.id}>
                        <td data-label="Folio">
                          <span className="badge-numero">{equipo.folio}</span>
                        </td>
                        <td data-label="Equipo">
                          <div className="equipment-cell">
                            <div className="equipment-avatar">
                              {equipo.foto ? (
                                <img src={`${API_BASE}${equipo.foto}`} alt="" className="equipment-avatar-img" />
                              ) : (
                                <span style={{ fontSize: '1rem' }}>💻</span>
                              )}
                            </div>
                            <div>
                              <strong>{equipo.marca}</strong> {equipo.modelo}
                              {equipo.categoria_nombre && (
                                <small style={{ display: 'block', color: 'var(--text-soft)', fontSize: '0.75rem' }}>
                                  {equipo.categoria_nombre}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="N° Serie">
                          <code style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                            {equipo.serie || 'S/N'}
                          </code>
                        </td>
                        <td data-label="Ubicación">{equipo.ubicacion_nombre || equipo.ubicacion || 'Sin ubicación'}</td>
                        <td data-label="Estado">
                          <span className={`status-pill ${equipo.estado}`}>{equipo.estado}</span>
                        </td>
                        <td data-label="Acciones">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => handleOpenEquipmentDetail(equipo)}
                              title="Ver detalle completo e historial"
                            >
                              Detalle
                            </button>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => {
                                const url = `${API_BASE}/api/inventory/equipos/${equipo.id}/qr`
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }}
                            >
                              QR
                            </button>
                            {canModify && (
                              <>
                                <button type="button" className="link-button" onClick={() => handleEditEquipment(equipo)}>
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="link-button"
                                  style={{ color: 'var(--danger, #c62828)' }}
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar el equipo ${equipo.folio}?`)) {
                                      handleDeleteEquipment(equipo.id)
                                    }
                                  }}
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-row">
                        No hay equipos registrados todavía.{canModify ? ' Completa el formulario de arriba para registrar tu primer equipo.' : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'entradas') {
      const equiposDisponibles = equipos.filter((e) => e.estado === 'disponible').length
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Entradas</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', margin: 0 }}>
                Registra el ingreso de un equipo generando su acta de entrada.
              </p>
            </div>

            {canModify ? (
            <form className="form-grid" onSubmit={handleRegisterEntry}>
              <label>
                <span>Responsable</span>
                <input
                  value={entryForm.responsable}
                  onChange={(event) => setEntryForm({ ...entryForm, responsable: event.target.value })}
                  placeholder="Nombre del responsable"
                />
              </label>
              <label>
                <span>Ubicación / Observaciones</span>
                <input
                  value={entryForm.ubicacion}
                  onChange={(event) => setEntryForm({ ...entryForm, ubicacion: event.target.value })}
                  placeholder="Bodega / Oficina"
                />
              </label>
              <label>
                <span>Número de cajas</span>
                <input
                  type="number"
                  min="1"
                  value={entryForm.cajas}
                  onChange={(event) => setEntryForm({ ...entryForm, cajas: event.target.value })}
                />
              </label>
              <label>
                <span>Correo para recibir el acta</span>
                <input
                  type="email"
                  value={entryForm.email}
                  onChange={(event) => setEntryForm({ ...entryForm, email: event.target.value })}
                  placeholder="responsable@ejemplo.com (opcional)"
                />
              </label>

              <div className="acta-items" style={{ gridColumn: '1 / -1' }}>
                <div className="acta-items-head">
                  <strong>Equipos de la entrada</strong>
                  <span>Puedes agregar varios equipos diferentes en la misma acta. Cada equipo genera sus filas según la cantidad y sus seriales.</span>
                </div>

                {entryItems.map((linea, i) => {
                  const eqSel = equipos.find((e) => String(e.id) === String(linea.equipo_id))
                  const cantidad = Math.max(1, Number(linea.cantidad || 1) || 1)
                  const total = Number(linea.precio || 0) * cantidad
                  const setLinea = (patch) => {
                    const items = [...entryItems]
                    items[i] = { ...items[i], ...patch }
                    setEntryItems(items)
                  }
                  return (
                    <div key={i} className="acta-item-row">
                      <div className="acta-item-main">
                        <select
                          value={linea.equipo_id || ''}
                          onChange={(event) => setLinea({ equipo_id: event.target.value })}
                        >
                          <option value="">Selecciona un equipo</option>
                          {equipos.map((eq) => (
                            <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo} ({eq.estado})</option>
                          ))}
                        </select>
                        <label className="acta-item-qty">
                          <span>Cantidad</span>
                          <input
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(event) => {
                              const n = Math.max(1, Number(event.target.value || 1))
                              const seriales = Array.from({ length: n }, (_, k) => linea.seriales[k] || '')
                              setLinea({ cantidad: String(n), seriales })
                            }}
                          />
                        </label>
                        <label className="acta-item-qty">
                          <span>Precio ($)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.precio}
                            onChange={(event) => setLinea({ precio: event.target.value })}
                            placeholder="0.00"
                          />
                        </label>
                        <label className="acta-item-qty acta-item-total">
                          <span>Subtotal</span>
                          <strong>{'$ ' + total.toLocaleString('es-CO')}</strong>
                        </label>
                      </div>

                      <div className="acta-item-seriales">
                        <span>N° de serie por unidad (uno por campo)</span>
                        {eqSel && !eqSel.serie && (
                          <div style={{ gridColumn: '1 / -1', fontSize: '0.78rem', color: 'var(--warning)', background: 'rgba(245,124,0,.08)', border: '1px solid rgba(245,124,0,.25)', borderRadius: '6px', padding: '6px 8px' }}>
                            ⚠ Este equipo no tiene serial registrado en el inventario. Escribe el serial de cada unidad manualmente a continuación; se guardará como valor real en el acta.
                          </div>
                        )}
                        {linea.seriales.map((serie, j) => (
                          <input
                            key={j}
                            type="text"
                            value={serie}
                            onChange={(event) => {
                              const seriales = [...linea.seriales]
                              seriales[j] = event.target.value
                              setLinea({ seriales })
                            }}
                            placeholder={eqSel ? `${eqSel.folio} · Serial unidad ${j + 1}` : `Serial unidad ${j + 1}`}
                          />
                        ))}
                      </div>

                      {entryItems.length > 1 && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => setEntryItems(entryItems.filter((_, k) => k !== i))}
                          title="Quitar este equipo de la entrada"
                        >
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                  )
                })}

                <button
                  type="button"
                  className="btn-quick-status"
                  onClick={() => setEntryItems([...entryItems, { equipo_id: '', cantidad: '1', precio: '', seriales: [''] }])}
                >
                  ➕ Agregar otro equipo a la entrada
                </button>
              </div>

              <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(33,150,243,0.05)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>📷 Fotos de la entrada (opcional)</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-soft)', margin: '4px 0 8px' }}>Adjunta hasta 3 fotos como evidencia de la recepción.</p>
                <input type="file" accept="image/*" multiple onChange={(event) => setEntryPhotos(Array.from(event.target.files || []).slice(0, 3))} />
                {entryPhotos.length > 0 && (
                  <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                    {entryPhotos.map((fl, idx) => (
                      <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '8px', margin: '0 6px 6px 0' }}>
                        {fl.name}
                        <button type="button" className="link-button danger-text" onClick={() => setEntryPhotos(entryPhotos.filter((_, k) => k !== idx))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn-primary">Registrar entrada</button>
              </div>
            </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Tu rol ({currentUser?.rol}) es de solo lectura.
              </p>
            )}

            <div className="mini-grid">
              <div className="action-card">
                <strong>{equiposDisponibles}</strong>
                <span>Disponibles en bodega</span>
              </div>
              <div className="action-card">
                <strong>{actas.filter((a) => a.tipo === 'ENTRADA').length}</strong>
                <span>Actas de entrada generadas</span>
              </div>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'salidas') {
      const equiposAsignados = equipos.filter((e) => e.estado === 'asignado').length
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Salidas</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', margin: 0 }}>
                Registra la salida/despacho de un equipo generando su acta de salida.
              </p>
            </div>

            {canModify ? (
            <form className="form-grid" onSubmit={handleNewExit}>
              <label>
                <span>Responsable</span>
                <input
                  value={exitForm.responsable}
                  onChange={(event) => setExitForm({ ...exitForm, responsable: event.target.value })}
                  placeholder="Nombre del responsable"
                />
              </label>
              <label>
                <span>Destino / Proyecto</span>
                <select
                  value={exitForm.destino}
                  onChange={(event) => setExitForm({ ...exitForm, destino: event.target.value })}
                >
                  <option value="">Selecciona el destino</option>
                  {(puntos || []).filter((p) => p.estado !== 'inactivo').length > 0 && (
                    <optgroup label="Farmacias / Sedes">
                      {(puntos || []).filter((p) => p.estado !== 'inactivo').map((p) => (
                        <option key={`sed-${p.id}`} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </optgroup>
                  )}
                  {ubicaciones.map((loc) => (
                    <option key={loc.id} value={loc.nombre}>{loc.nombre}</option>
                  ))}
                  <option value="__otra__">Otra (escribir destino)</option>
                </select>
                {exitForm.destino === '__otra__' && (
                  <input
                    value={exitForm.destino_otro}
                    onChange={(event) => setExitForm({ ...exitForm, destino_otro: event.target.value })}
                    placeholder="Área / Usuario / Proyecto"
                    style={{ gridColumn: '1 / -1' }}
                  />
                )}
              </label>
              <label>
                <span>Correo para recibir el acta</span>
                <input
                  type="email"
                  value={exitForm.email}
                  onChange={(event) => setExitForm({ ...exitForm, email: event.target.value })}
                  placeholder="responsable@ejemplo.com (opcional)"
                />
              </label>

              <div className="acta-items" style={{ gridColumn: '1 / -1' }}>
                <div className="acta-items-head">
                  <strong>Equipos de la salida</strong>
                  <span>Puedes agregar varios equipos diferentes en la misma acta de salida.</span>
                </div>

                {exitItems.map((linea, i) => {
                  const eqSel = equipos.find((e) => String(e.id) === String(linea.equipo_id))
                  const setLinea = (patch) => {
                    const items = [...exitItems]
                    items[i] = { ...items[i], ...patch }
                    setExitItems(items)
                  }
                  const cantidad = Math.max(1, Number(linea.cantidad || 1) || 1)
                  return (
                    <div key={i} className="acta-item-row">
                      <div className="acta-item-main">
                        <select
                          value={linea.equipo_id || ''}
                          onChange={(event) => setLinea({ equipo_id: event.target.value })}
                        >
                          <option value="">Selecciona un equipo</option>
                          {equipos.map((eq) => (
                            <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo} ({eq.estado})</option>
                          ))}
                        </select>
                        <label className="acta-item-qty">
                          <span>Cantidad</span>
                          <input
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(event) => {
                              const n = Math.max(1, Number(event.target.value || 1))
                              const seriales = Array.from({ length: n }, (_, k) => linea.seriales[k] || '')
                              setLinea({ cantidad: String(n), seriales })
                            }}
                          />
                        </label>
                      </div>

                      <div className="acta-item-seriales">
                        <span>N° de serie por unidad (uno por campo)</span>
                        {eqSel && !eqSel.serie && (
                          <div style={{ gridColumn: '1 / -1', fontSize: '0.78rem', color: 'var(--warning)', background: 'rgba(245,124,0,.08)', border: '1px solid rgba(245,124,0,.25)', borderRadius: '6px', padding: '6px 8px' }}>
                            ⚠ Este equipo no tiene serial en el inventario. Escribe el serial de cada unidad manualmente.
                          </div>
                        )}
                        {linea.seriales.map((serie, j) => (
                          <input
                            key={j}
                            type="text"
                            value={serie}
                            onChange={(event) => {
                              const seriales = [...linea.seriales]
                              seriales[j] = event.target.value
                              setLinea({ seriales })
                            }}
                            placeholder={eqSel ? `${eqSel.folio} · Serial unidad ${j + 1}` : `Serial unidad ${j + 1}`}
                          />
                        ))}
                      </div>

                      {exitItems.length > 1 && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => setExitItems(exitItems.filter((_, k) => k !== i))}
                          title="Quitar este equipo de la salida"
                        >
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                  )
                })}

                <button
                  type="button"
                  className="btn-quick-status"
                  onClick={() => setExitItems([...exitItems, { equipo_id: '', cantidad: '1', seriales: [''] }])}
                >
                  ➕ Agregar otro equipo a la salida
                </button>
              </div>

              <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(33,150,243,0.05)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>📷 Fotos de la salida (opcional)</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-soft)', margin: '4px 0 8px' }}>Adjunta hasta 3 fotos como evidencia del despacho/entrega.</p>
                <input type="file" accept="image/*" multiple onChange={(event) => setExitPhotos(Array.from(event.target.files || []).slice(0, 3))} />
                {exitPhotos.length > 0 && (
                  <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                    {exitPhotos.map((fl, idx) => (
                      <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '8px', margin: '0 6px 6px 0' }}>
                        {fl.name}
                        <button type="button" className="link-button danger-text" onClick={() => setExitPhotos(exitPhotos.filter((_, k) => k !== idx))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn-primary">Nueva salida</button>
              </div>
            </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Tu rol ({currentUser?.rol}) es de solo lectura.
              </p>
            )}

            <div className="mini-grid">
              <div className="action-card">
                <strong>{equiposAsignados}</strong>
                <span>Equipos asignados en operación</span>
              </div>
              <div className="action-card">
                <strong>{actas.filter((a) => a.tipo === 'SALIDA').length}</strong>
                <span>Actas de salida generadas</span>
              </div>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'mantenimiento') {
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Mantenimiento</h2>
            </div>

            {mtAlertas.length > 0 && (
              <div
                style={{
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  background: mtAlertas.some((a) => a.nivel === 'vencida') ? 'rgba(198,40,40,0.12)' : 'rgba(255,152,0,0.12)',
                  border: `1px solid ${mtAlertas.some((a) => a.nivel === 'vencida') ? 'var(--danger,#c62828)' : 'var(--warning,#f57c00)'}`,
                }}
              >
                <strong style={{ display: 'block', marginBottom: '6px' }}>
                  {mtAlertas.some((a) => a.nivel === 'vencida') ? 'Mantenimientos vencidos / próximos' : 'Mantenimientos próximos'}
                </strong>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {mtAlertas.slice(0, 6).map((a) => (
                    <li key={a.id} style={{ marginBottom: '4px' }}>
                      {a.equipo_marca} {a.equipo_modelo} ({a.equipo_folio}) — {a.tipo} —{' '}
                      {a.fecha_programada ? new Date(a.fecha_programada).toLocaleDateString('es-CO') : 's/fecha'} ·{' '}
                      <strong style={{ textTransform: 'capitalize' }}>{a.nivel}</strong>{' '}
                      {' · '}
                      <button type="button" className="link-button" onClick={() => handlePrintMantenimiento(a.id)}>Ver acta</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canModify ? (
            <form className="form-grid" onSubmit={handleMtGrupalSubmit} style={{ padding: '18px', border: '1px solid rgba(13,71,161,.25)', borderRadius: '10px', marginTop: '16px', background: 'rgba(13,71,161,.03)' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '0 0 4px' }}>Acta grupal de mantenimiento (visita a farmacia/sede)</h3>
                <p className="text-soft" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Al finalizar la visita, registra aquí todos los equipos atendidos: escribe el <strong>nombre del equipo</strong> y su <strong>número de serie</strong>. Se genera un acta con todos los equipos.
                </p>
              </div>

              <label className="field">
                <span>Cliente / sede</span>
                <input
                  type="text"
                  value={mtGrupalForm.cliente}
                  onChange={(e) => setMtGrupalForm({ ...mtGrupalForm, cliente: e.target.value })}
                  placeholder="Ej: Farmacia El Sol"
                />
              </label>
              <label className="field">
                <span>Técnico</span>
                <input
                  type="text"
                  value={mtGrupalForm.tecnico}
                  onChange={(e) => setMtGrupalForm({ ...mtGrupalForm, tecnico: e.target.value })}
                  placeholder="Nombre del técnico"
                />
              </label>
              <label className="field">
                <span>Prioridad</span>
                <select
                  value={mtGrupalForm.prioridad}
                  onChange={(e) => setMtGrupalForm({ ...mtGrupalForm, prioridad: e.target.value })}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </label>
              <label className="field">
                <span>Observaciones</span>
                <input
                  type="text"
                  value={mtGrupalForm.observaciones}
                  onChange={(e) => setMtGrupalForm({ ...mtGrupalForm, observaciones: e.target.value })}
                  placeholder="Detalle general de la visita"
                />
              </label>

              <div className="acta-items" style={{ gridColumn: '1 / -1' }}>
                <div className="acta-items-head">
                  <strong>Equipos atendidos en la visita</strong>
                  <span>Agrega un campo por cada equipo, con su serial.</span>
                </div>

                {mtGrupalItems.map((item, i) => {
                  const setItem = (patch) => {
                    const items = [...mtGrupalItems]
                    items[i] = { ...items[i], ...patch }
                    setMtGrupalItems(items)
                  }
                  return (
                    <div key={i} className="acta-item-row">
                      <div className="acta-item-main">
                        <input
                          type="text"
                          value={item.nombre_equipo}
                          onChange={(e) => setItem({ nombre_equipo: e.target.value })}
                          placeholder="Nombre / descripción del equipo (ej: Impresora ZY-200)"
                        />
                        <input
                          type="text"
                          value={item.serie}
                          onChange={(e) => setItem({ serie: e.target.value })}
                          placeholder="N° de serie (obligatorio)"
                        />
                      </div>
                      {mtGrupalItems.length > 1 && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => setMtGrupalItems(mtGrupalItems.filter((_, k) => k !== i))}
                          title="Quitar este equipo del acta"
                        >
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                  )
                })}

                <button
                  type="button"
                  className="btn-quick-status"
                  onClick={() => setMtGrupalItems([...mtGrupalItems, { nombre_equipo: '', serie: '' }])}
                >
                  ➕ Agregar otro equipo al acta
                </button>
              </div>

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn-primary">Generar acta de mantenimiento</button>
              </div>
            </form>
            ) : null}

            {canModify ? (
            <form className="form-grid" onSubmit={handleMantenimientoSubmit}>
              <label>
                <span>Equipo</span>
                <select
                  value={mantenimientoForm.equipo_id || ''}
                  onChange={(event) => {
                    const eq = equipos.find((e) => String(e.id) === event.target.value)
                    setMantenimientoForm({
                      ...mantenimientoForm,
                      equipo_id: eq ? eq.id : '',
                      equipo_folio: eq ? eq.folio : '',
                    })
                  }}
                >
                  <option value="">Selecciona un equipo</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sede / Punto</span>
                <select
                  value={mantenimientoForm.punto_id || ''}
                  onChange={(event) => {
                    const p = (puntos || []).find((pp) => String(pp.id) === event.target.value)
                    setMantenimientoForm({
                      ...mantenimientoForm,
                      punto_id: p ? p.id : '',
                      punto_nombre: p ? p.nombre : '',
                    })
                  }}
                >
                  <option value="">Selecciona una sede (opcional)</option>
                  {(puntos || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} — {p.ciudad || ''}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={mantenimientoForm.tipo}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, tipo: event.target.value })}
                >
                  <option value="preventivo">Preventivo</option>
                  <option value="correctivo">Correctivo</option>
                </select>
              </label>
              <label>
                <span>Técnico</span>
                <input
                  value={mantenimientoForm.tecnico}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, tecnico: event.target.value })}
                  placeholder="Nombre del técnico"
                />
              </label>
              <label>
                <span>Fecha programada</span>
                <input
                  type="date"
                  value={mantenimientoForm.fecha_programada}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, fecha_programada: event.target.value })}
                />
              </label>
              <label>
                <span>Prioridad</span>
                <select
                  value={mantenimientoForm.prioridad}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, prioridad: event.target.value })}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </label>
              <label>
                <span>Periodicidad del programa</span>
                <select
                  value={mantenimientoForm.periodicidad}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, periodicidad: event.target.value })}
                >
                  <option value="mensual">Mensual (30 días)</option>
                  <option value="trimestral">Trimestral (90 días)</option>
                  <option value="semestral">Semestral (180 días)</option>
                  <option value="anual">Anual (365 días)</option>
                </select>
              </label>
              <label>
                <span>Descripción</span>
                <input
                  value={mantenimientoForm.descripcion}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, descripcion: event.target.value })}
                  placeholder="Detalle del trabajo"
                />
              </label>
              <label>
                <span>Piezas / Repuestos usados</span>
                <input
                  value={mantenimientoForm.piezas}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, piezas: event.target.value })}
                  placeholder="Ej: SSD 512GB x1, pasta térmica"
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Programar mantenimiento</button>
              </div>
            </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Tu rol ({currentUser?.rol}) es de solo lectura.
              </p>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Tipo</th>
                    <th>Periódico</th>
                    <th>Técnico</th>
                    <th>Sede</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientos.length ? (
                    mantenimientos.slice((mtPage - 1) * MT_PAGE_SIZE, mtPage * MT_PAGE_SIZE).map((item) => (
                      <tr key={item.id}>
                        <td data-label="Equipo">
                          <strong>{item.equipo_folio}</strong>
                          {item.equipo_marca && (
                            <span className="text-soft" style={{ display: 'block', fontSize: '0.75rem' }}>
                              {item.equipo_marca} {item.equipo_modelo || ''}
                            </span>
                          )}
                        </td>
                        <td data-label="Tipo" style={{ textTransform: 'capitalize' }}>{item.tipo}</td>
                        <td data-label="Periódico" style={{ textTransform: 'capitalize' }}>{item.periodicidad || '—'}</td>
                        <td data-label="Técnico">{item.tecnico || '—'}</td>
                        <td data-label="Sede">{item.punto_nombre || '—'}</td>
                        <td data-label="Descripción">{item.descripcion || '—'}</td>
                        <td data-label="Estado">
                          <span className={`status-pill ${item.estado}`}>{item.estado.replace('_', ' ')}</span>
                        </td>
                        <td data-label="Prioridad"><span className={`status-pill prio-${item.prioridad || 'media'}`}>{(item.prioridad || 'media')}</span></td>
                        <td data-label="Acciones">
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => handlePrintMantenimiento(item.id)}
                            >
                              Imprimir
                            </button>
                            {canModify && (
                              <>
                                <button
                                  type="button"
                                  className="link-button"
                                  onClick={() => handleMtVerHistorial(item.equipo_id)}
                                >
                                  Historial
                                </button>
                                <input
                                  id={`mt-evidencia-${item.id}`}
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleMtEvidenciaChange(e, item.id)}
                                />
                                <button
                                  type="button"
                                  className="link-button"
                                  onClick={() => document.getElementById(`mt-evidencia-${item.id}`).click()}
                                >
                                  {item.foto ? 'Cambiar evidencia' : 'Evidencia'}
                                </button>
                              </>
                            )}
                            {canModify && mtEvidenciaTarget === item.id && mtEvidenciaFile && (
                              <button type="button" className="link-button" style={{ color: 'var(--success,#2e7d32)' }} onClick={handleMtUploadEvidencia}>
                                Subir imagen
                              </button>
                            )}
                            {canModify && item.estado !== 'finalizado' && (
                              <button
                                type="button"
                                className="link-button"
                                onClick={() =>
                                  handleMantenimientoEstado(
                                    item.id,
                                    item.estado === 'programado' ? 'en_proceso' : 'finalizado'
                                  )
                                }
                              >
                                {item.estado === 'programado' ? 'Iniciar' : 'Finalizar'}
                              </button>
                            )}
                            {canModify && item.estado !== 'finalizado' && (
                              <button
                                type="button"
                                className="link-button danger-text"
                                onClick={() => handleEliminarMantenimiento(item)}
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-row">
                      No hay mantenimientos registrados todavía. {canModify ? 'Usa el botón "+ Nuevo mantenimiento" para programar el primero.' : ''}
                    </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {mantenimientos.length > MT_PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', padding: '10px 0', fontSize: '0.8rem' }}>
                <button type="button" className="btn-outline small" disabled={mtPage <= 1} onClick={() => setMtPage((p) => Math.max(1, p - 1))}>← Anterior</button>
                <span className="text-soft">Página {mtPage} de {Math.max(1, Math.ceil(mantenimientos.length / MT_PAGE_SIZE))}</span>
                <button type="button" className="btn-outline small" disabled={mtPage >= Math.ceil(mantenimientos.length / MT_PAGE_SIZE)} onClick={() => setMtPage((p) => p + 1)}>Siguiente →</button>
              </div>
            )}

            <div className="panel-header" style={{ marginTop: '28px' }}>
              <h3 style={{ margin: 0 }}>Reportes de mantenimiento</h3>
            </div>
            <div style={{ padding: '16px 18px', border: '1px solid rgba(13,71,161,.25)', borderRadius: '10px', background: 'rgba(13,71,161,.03)' }}>
              <p className="text-soft" style={{ margin: '0 0 12px', fontSize: '0.85rem' }}>
                Genera el <strong>nombramiento por técnico</strong> o el reporte por <strong>sede / farmacia</strong> filtrando por fecha programada.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label className="field">
                  <span>Desde</span>
                  <input type="date" value={mtRepDesde} onChange={(e) => setMtRepDesde(e.target.value)} />
                </label>
                <label className="field">
                  <span>Hasta</span>
                  <input type="date" value={mtRepHasta} onChange={(e) => setMtRepHasta(e.target.value)} />
                </label>
                <button type="button" className="btn-outline small" onClick={() => handleMtRepCargar('tecnico')} disabled={mtRepCargando}>
                  {mtRepCargando && mtRepModo === 'tecnico' ? 'Cargando…' : 'Ver por técnico'}
                </button>
                <button type="button" className="btn-outline small" onClick={() => handleMtRepCargar('sede')} disabled={mtRepCargando}>
                  {mtRepCargando && mtRepModo === 'sede' ? 'Cargando…' : 'Ver por sede'}
                </button>
                <button type="button" className="btn-primary small" onClick={() => handleMtRepPdf('tecnico')}>PDF por técnico</button>
                <button type="button" className="btn-primary small" onClick={() => handleMtRepPdf('sede')}>PDF por sede / farmacia</button>
              </div>

              {mtRepData && mtRepData.grupos && (
                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: '10px' }}>
                    {mtRepModo === 'tecnico' ? 'Nombramiento por técnico' : 'Mantenimientos por sede'} · {mtRepData.total} mantenimientos en el rango
                  </div>
                  {mtRepData.grupos.map((g, idx) => (
                    <div key={idx} style={{ marginBottom: '14px', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', background: 'rgba(13,71,161,.06)', fontWeight: 600, fontSize: '0.85rem' }}>
                        {mtRepModo === 'tecnico' ? `Técnico: ${g.tecnico}` : `Sede: ${g.punto}`}
                        <span className="text-soft" style={{ fontWeight: 400 }}>
                          {' '}· {g.conteos.total} total · {g.conteos.finalizado} realizados · {g.conteos.pendientes} pendientes · {g.conteos.vencidos} vencidos
                        </span>
                      </div>
                      <div className="table-wrap">
                        <table style={{ fontSize: '0.78rem' }}>
                          <thead>
                            <tr>
                              <th>Folio</th>
                              <th>Equipo</th>
                              <th>Tipo</th>
                              <th>Sede</th>
                              <th>Técnico</th>
                              <th>Fecha programada</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.registros.length ? g.registros.map((r) => (
                              <tr key={r.id}>
                                <td>{r.folio}</td>
                                <td>{r.equipo}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.tipo}</td>
                                <td>{r.punto || '—'}</td>
                                <td>{r.tecnico || '—'}</td>
                                <td>{r.fecha_programada ? new Date(r.fecha_programada).toLocaleDateString('es-CO') : '—'}</td>
                                <td><span className={`status-pill ${r.estado}`}>{r.estado.replace('_', ' ')}</span></td>
                              </tr>
                            )) : (
                              <tr><td colSpan="7" className="empty-row">Sin registros</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel-header" style={{ marginTop: '28px' }}>
              <h3 style={{ margin: 0 }}>Actas de mantenimiento por visita ({actasMt.length})</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Acta</th>
                    <th>Cliente / sede</th>
                    <th>Fecha</th>
                    <th>Técnico</th>
                    <th>Equipos</th>
                    <th>Prioridad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {actasMt.length ? (
                    actasMt.slice((mtgPage - 1) * MT_PAGE_SIZE, mtgPage * MT_PAGE_SIZE).map((a) => (
                      <tr key={a.id}>
                        <td data-label="Acta"><strong>{a.numero}</strong></td>
                        <td data-label="Cliente">{a.cliente || '—'}</td>
                        <td data-label="Fecha">{a.fecha ? new Date(a.fecha).toLocaleDateString('es-CO') : '—'}</td>
                        <td data-label="Técnico">{a.tecnico || '—'}</td>
                        <td data-label="Equipos">{a.cantidad_equipos ?? '—'}</td>
                        <td data-label="Prioridad"><span className={`status-pill prio-${a.prioridad || 'media'}`}>{(a.prioridad || 'media')}</span></td>
                        <td data-label="Acciones">
                          <button type="button" className="link-button" onClick={() => handleActasMtPdf(a)}>PDF</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        No hay actas de mantenimiento por visita todavía. {canModify ? 'Usa el formulario de arriba después de atender una sede.' : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {actasMt.length > MT_PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', padding: '10px 0', fontSize: '0.8rem' }}>
                <button type="button" className="btn-outline small" disabled={mtgPage <= 1} onClick={() => setMtgPage((p) => Math.max(1, p - 1))}>← Anterior</button>
                <span className="text-soft">Página {mtgPage} de {Math.max(1, Math.ceil(actasMt.length / MT_PAGE_SIZE))}</span>
                <button type="button" className="btn-outline small" disabled={mtgPage >= Math.ceil(actasMt.length / MT_PAGE_SIZE)} onClick={() => setMtgPage((p) => p + 1)}>Siguiente →</button>
              </div>
            )}
          </article>
        </section>
      )
    }

    if (activeSection === 'categorias') {
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Categorías de equipos</h2>
            </div>

            {canModify ? (
            <form className="form-grid" onSubmit={handleCategoriaSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  value={categoriaForm.nombre}
                  onChange={(event) => setCategoriaForm({ ...categoriaForm, nombre: event.target.value })}
                  placeholder="Cómputo"
                />
              </label>
              <label>
                <span>Descripción</span>
                <input
                  value={categoriaForm.descripcion}
                  onChange={(event) => setCategoriaForm({ ...categoriaForm, descripcion: event.target.value })}
                  placeholder="Portátiles, PC de escritorio"
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Agregar categoría</button>
              </div>
            </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Tu rol ({currentUser?.rol}) es de solo lectura.
              </p>
            )}

            <div className="chip-list">
              {categorias.map((cat) => (
                <span key={cat.id} className="chip">
                  {cat.nombre}
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
                          handleDeleteCategoria(cat.id, cat.nombre)
                        }
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'soporte') {
      const filtroTickets = ticketFilterEstado === 'todos'
        ? tickets
        : tickets.filter((t) => t.estado === ticketFilterEstado)
      const estadosSiguientes = { abierto: 'en_visita', en_visita: 'resuelto', resuelto: 'cerrado' }
      const colorEstado = { abierto: 'var(--warning)', en_visita: 'var(--primary)', resuelto: 'var(--success)', cerrado: 'var(--text-soft)' }
      const colorPrioridad = { alta: 'var(--danger)', media: 'var(--warning)', baja: 'var(--success)' }
      const pendientesSoporte = tickets.filter((t) => t.estado !== 'cerrado').length
      return (
        <section className="section-grid">
          <div className="mini-grid" style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
            <div className="action-card highlight">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎫 Tickets abiertos</span>
              <strong style={{ fontSize: '2rem' }}>{pendientesSoporte}</strong>
              <small>Soporte interno del área de sistemas</small>
            </div>
            <div className="action-card">
              <span>En visita</span>
              <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>{tickets.filter((t) => t.estado === 'en_visita').length}</strong>
              <small>Técnicos asignados en sitio</small>
            </div>
            <div className="action-card">
              <span>Resueltos (mes)</span>
              <strong style={{ fontSize: '2rem', color: 'var(--success)' }}>{tickets.filter((t) => t.estado === 'resuelto' || t.estado === 'cerrado').length}</strong>
              <small>Cerrados en el sistema</small>
            </div>
          </div>

          <article className="panel wide-panel">
            <div className="panel-header">
              <h2>Mesa de ayuda — Tickets internos</h2>
              <div className="header-actions">
                <select
                  className="filter-select"
                  style={{ maxWidth: '170px' }}
                  value={ticketFilterEstado}
                  onChange={(e) => setTicketFilterEstado(e.target.value)}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="abierto">Abiertos</option>
                  <option value="en_visita">En visita</option>
                  <option value="resuelto">Resueltos</option>
                  <option value="cerrado">Cerrados</option>
                </select>
                {canModify && (
                  <button type="button" className="btn-primary small" onClick={() => setTicketModalOpen(true)}>
                    + Nuevo ticket
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Título</th>
                    <th>Equipo</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Técnico</th>
                    <th>Creado</th>
                    {canModify && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtroTickets.length ? (
                    filtroTickets.map((tk) => (
                      <tr key={tk.id}>
                        <td data-label="#"><code className="badge-numero">#{tk.id}</code></td>
                        <td data-label="Título">
                          <strong>{tk.titulo}</strong>
                          {tk.descripcion && (
                            <small className="block text-soft" style={{ display: 'block', fontSize: '0.75rem' }}>
                              {tk.descripcion.slice(0, 60)}{tk.descripcion.length > 60 ? '…' : ''}
                            </small>
                          )}
                        </td>
                        <td data-label="Equipo">{tk.equipo_folio || '—'}</td>
                        <td data-label="Prioridad">
                          <span className="ticket-pill" style={{ color: colorPrioridad[tk.prioridad] || 'var(--text-soft)', background: 'transparent' }}>
                            {tk.prioridad}
                          </span>
                        </td>
                        <td data-label="Estado">
                          <span className={`ticket-pill ticket-pill-${tk.estado}`} style={{ color: colorEstado[tk.estado], background: 'transparent' }}>
                            {tk.estado === 'en_visita' ? 'en visita' : tk.estado}
                          </span>
                        </td>
                        <td data-label="Técnico">{tk.tecnico || 'Sin asignar'}</td>
                        <td data-label="Creado">
                          {tk.created_at ? new Date(tk.created_at).toLocaleDateString('es-CO') : '—'}
                        </td>
                        {canModify && (
                          <td data-label="Acciones">
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button type="button" className="link-button small" onClick={() => abrirTicketDetalle(tk)}>
                                Ver
                              </button>
                              {estadosSiguientes[tk.estado] && (
                                <button type="button" className="link-button small" style={{ color: 'var(--accent)' }} onClick={() => handleTicketEstado(tk, estadosSiguientes[tk.estado])}>
                                  → {estadosSiguientes[tk.estado]}
                                </button>
                              )}
                              {canAdmin && (
                                <button type="button" className="link-button small" style={{ color: 'var(--danger)' }} onClick={() => handleTicketEliminar(tk)}>
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-soft)' }}>
                        Sin tickets. Crea uno desde «+ Nuevo ticket» o escanea el QR de un equipo en falla.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'ubicaciones') {
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Ubicaciones y bodegas</h2>
            </div>

            {canModify ? (
            <form className="form-grid" onSubmit={handleUbicacionSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  value={ubicacionForm.nombre}
                  onChange={(event) => setUbicacionForm({ ...ubicacionForm, nombre: event.target.value })}
                  placeholder="Bodega Central"
                />
              </label>
              <label>
                <span>Ciudad</span>
                <input
                  value={ubicacionForm.ciudad}
                  onChange={(event) => setUbicacionForm({ ...ubicacionForm, ciudad: event.target.value })}
                  placeholder="Bogotá"
                />
              </label>
              <label>
                <span>Dirección</span>
                <input
                  value={ubicacionForm.direccion}
                  onChange={(event) => setUbicacionForm({ ...ubicacionForm, direccion: event.target.value })}
                  placeholder="Calle 26 N 68C-61"
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Agregar ubicación</button>
              </div>
            </form>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Tu rol ({currentUser?.rol}) es de solo lectura.
              </p>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Dirección</th>
                    {canModify && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {ubicaciones.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.ciudad || '—'}</td>
                      <td>{u.direccion || '—'}</td>
                      {canModify && (
                        <td>
                          <button
                            type="button"
                            className="link-button"
                            style={{ color: 'var(--danger, #c62828)' }}
                            onClick={() => {
                              if (window.confirm(`¿Eliminar la ubicación "${u.nombre}"?`)) {
                                handleDeleteUbicacion(u.id, u.nombre)
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'usuarios') {
      if (!canAdmin) {
        return (
          <section className="section-grid">
            <article className="panel">
              <div className="panel-header"><h2>Acceso restringido</h2></div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>
                El módulo de <strong>Usuarios</strong> está reservado para el rol <strong>Administrador</strong>.
                Tu rol actual es <strong>{currentUser?.rol}</strong>. Contacta al administrador para gestionar usuarios.
              </p>
            </article>
          </section>
        )
      }
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Usuarios y roles</h2>
            </div>

            <form className="form-grid" onSubmit={handleUsuarioSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  value={usuarioForm.nombre}
                  onChange={(event) => setUsuarioForm({ ...usuarioForm, nombre: event.target.value })}
                  placeholder="Nombre completo"
                />
              </label>
              <label>
                <span>Correo</span>
                <input
                  value={usuarioForm.correo}
                  onChange={(event) => setUsuarioForm({ ...usuarioForm, correo: event.target.value })}
                  placeholder="nombre@sistemasbogota.com"
                />
              </label>
              <label>
                <span>Rol</span>
                <select
                  value={usuarioForm.rol}
                  onChange={(event) => setUsuarioForm({ ...usuarioForm, rol: event.target.value })}
                >
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="operativo">Operativo</option>
                </select>
              </label>
              <label>
                <span>{editingUsuarioId ? 'Nueva contraseña (opcional)' : 'Contraseña'}</span>
                <input
                  type="password"
                  value={usuarioForm.password}
                  onChange={(event) => setUsuarioForm({ ...usuarioForm, password: event.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingUsuarioId ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                {editingUsuarioId && (
                  <button
                    type="button"
                    className="btn-link-danger"
                    onClick={() => {
                      setEditingUsuarioId(null)
                      setUsuarioForm({ nombre: '', correo: '', rol: 'operativo', password: '' })
                    }}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td data-label="Nombre">{u.nombre}</td>
                      <td data-label="Correo">{u.correo}</td>
                      <td data-label="Rol">
                        <span className={`status-pill ${u.rol}`}>{u.rol}</span>
                      </td>
                      <td data-label="Estado">
                        <span className={`status-pill ${u.activo ? 'activo' : 'inactivo'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" className="link-button" onClick={() => handleEditUsuario(u)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() =>
                              handleToggleUsuarioEstado(u.id, u.activo !== false).then((ok) => {
                                if (ok) showToast(u.activo !== false ? 'Usuario desactivado' : 'Usuario activado')
                              })
                            }
                          >
                            {u.activo !== false ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            style={{ color: 'var(--danger, #c62828)' }}
                            onClick={() => {
                              if (window.confirm(`¿Eliminar al usuario "${u.nombre}"?`)) {
                                handleDeleteUsuario(u.id, u.nombre)
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )
    }
    if (activeSection === 'reportes') {
      return (
        <section className="section-grid">
          <article className="panel report-panel">
            <div className="panel-header">
              <h2>Reportes y Actas</h2>
              <div className="header-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary small"
                  onClick={() => setActiveSection('historial')}
                >
                  Ver Historial de Actas ({actas.length})
                </button>
                <button type="button" className="link-button" onClick={handleOpenActa}>
                  Ver acta en visor
                </button>
                <button type="button" className="link-button" onClick={handleExportReport}>
                  Última Acta PDF
                </button>
                <button type="button" className="link-button" onClick={handleExportXLSX} title="Exportar inventario a Excel">
                  Equipos Excel
                </button>
                <button type="button" className="link-button" onClick={handleExportActasXLSX} title="Exportar actas a Excel">
                  Actas Excel
                </button>
                <button type="button" className="link-button" onClick={handleExportMantenimientosXLSX} title="Exportar mantenimientos a Excel">
                  Mantenimiento Excel
                </button>
                <button type="button" className="link-button" onClick={handleExportPDFInventarioUbicacion} title="Inventario por ubicación en PDF con logo">
                  Inventario PDF
                </button>
                <button type="button" className="link-button" onClick={handleExportPDFResumenMantenimientos} title="Resumen de mantenimientos en PDF con logo">
                  Mantenimiento PDF
                </button>
              </div>
            </div>

            {!depreciacion && (
              <button
                type="button"
                className="link-button"
                style={{ margin: '0 0 16px' }}
                onClick={loadDepreciacion}
              >
                Ver valor del inventario por categoría
              </button>
            )}
            {depreciacion && (
              <div className="table-wrap" style={{ margin: '0 0 20px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Cantidad</th>
                      <th>Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciacion.por_categoria.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.categoria}</td>
                        <td>{item.cantidad}</td>
                        <td>${Number(item.valor_total).toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop: '10px', fontWeight: 700 }}>
                  Gran total: ${Number(depreciacion.gran_total).toLocaleString('es-CO')}
                </p>
              </div>
            )}

            <div className="mini-grid">
              <div className="action-card highlight">
                <strong>
                  {(() => {
                    const t = stats.totales || {}
                    const total = (t.disponibles || 0) + (t.asignados || 0) + (t.reparacion || 0) + (t.baja || 0) + (t.prestamo || 0)
                    if (!total) return '—'
                    return `${Math.round(((t.disponibles || 0) / total) * 100)}%`
                  })()}
                </strong>
                <span>Disponibilidad general</span>
              </div>
              <div className="action-card">
                <strong>{actas.length}</strong>
                <span>Actas emitidas</span>
              </div>
            </div>

            {actas.length > 0 ? (
            <div className="acta-card">
              <div className="acta-header">
                <div className="acta-brand">
                  <div className="acta-logo">
                    <img src="/logo_eticos.jpg" alt="Logo" className="brand-logo-img" />
                  </div>
                  <div>
                    <strong>INV - Sistemas</strong>
                    <small>Inventario y control de activos</small>
                  </div>
                </div>
                <div className="acta-meta">
                  <span>ACTA No. {actas[0]?.numero || '—'}</span>
                  <span>
                    Fecha:{' '}
                    {actas[0]?.created_at
                      ? new Date(actas[0].created_at).toLocaleDateString('es-CO')
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="acta-title-wrap">
                <h3>Acta de entrega / recepción de equipos</h3>
              </div>

              <div className="acta-info-grid">
                <div>
                  <span>Responsable</span>
                  <strong>{actas[0]?.entregado_por || '—'}</strong>
                </div>
                <div>
                  <span>Área / ubicación</span>
                  <strong>{actas[0]?.ciudad_destino || '—'}</strong>
                </div>
                <div>
                  <span>Tipo de movimiento</span>
                  <strong>{actas[0]?.tipo || '—'}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong>{actas[0]?.tipo === 'SALIDA' ? 'Despachado' : 'Registrado'}</strong>
                </div>
              </div>

              <div className="acta-table-wrap">
                <table className="acta-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>N° serie</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actas[0]?.items && actas[0].items.length ? (
                      actas[0].items.map((item) => (
                        <tr key={item.id || item.serial}>
                          <td>{item.dispositivo}</td>
                          <td>{item.marca || '—'}</td>
                          <td>{item.detalle || '—'}</td>
                          <td>{item.serial || '—'}</td>
                          <td>Verificado</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                          Sin ítems registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="acta-notes">
                <p>
                  {actas[0]?.observaciones ||
                    'Se verificó el estado físico, la documentación y la asignación correspondiente de cada equipo mencionado. El presente acta queda registrada como evidencia del ingreso o despacho de los activos al inventario institucional.'}
                </p>
              </div>

              <div className="signature-grid">
                <div className="signature-box">
                  <span>Entregó</span>
                  <strong>{actas[0]?.entregado_por || '________________________'}</strong>
                  <small>Nombre y firma</small>
                </div>
                <div className="signature-box">
                  <span>Recibió</span>
                  <strong>{actas[0]?.responsable_destino || '________________________'}</strong>
                  <small>Nombre y firma</small>
                </div>
                <div className="signature-box">
                  <span>Autorizó</span>
                  <strong>________________________</strong>
                  <small>Nombre y firma</small>
                </div>
              </div>
            </div>
            ) : (
              <div className="empty-state" style={{ padding: '28px', textAlign: 'center', color: 'var(--muted)' }}>
                <p>No hay actas registradas todavía.</p>
                <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>
                  Genera tu primera: entra a <strong>Entradas</strong> o <strong>Salidas</strong> desde el menú lateral y sigue los pasos.
                </p>
              </div>
            )}
          </article>
        </section>
      )
    }

    if (activeSection === 'prestamos') {
      const prestados = equipos.filter((e) => e.estado === 'prestamo')
      const disponibles = equipos.filter((e) => e.estado !== 'prestamo' && e.estado !== 'baja')
      return (
        <>
          <section className="section-header">
            <div>
              <h2>Préstamos y traspasos</h2>
              <p className="text-soft">Registra préstamos, controla retornos y cambia de ubicación los equipos.</p>
            </div>
          </section>

          {canModify && (
            <section className="panel">
              <div className="panel-header">
                <h3 style={{ margin: 0 }}>Registrar préstamo</h3>
              </div>
              <form className="form-grid" onSubmit={handlePrestamoSectionSubmit}>
                <label className="field">
                  <span>Equipo *</span>
                  <select
                    value={prestamoSectionForm.equipo_id}
                    onChange={(e) => setPrestamoSectionForm((f) => ({ ...f, equipo_id: e.target.value }))}
                  >
                    <option value="">Seleccione un equipo disponible</option>
                    {disponibles.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>¿A quién se presta? *</span>
                  <input
                    type="text"
                    value={prestamoSectionForm.prestamo_a}
                    onChange={(e) => setPrestamoSectionForm((f) => ({ ...f, prestamo_a: e.target.value }))}
                    placeholder="Nombre de la persona o área"
                  />
                </label>
                <label className="field">
                  <span>Motivo / observaciones</span>
                  <input
                    type="text"
                    value={prestamoSectionForm.motivo}
                    onChange={(e) => setPrestamoSectionForm((f) => ({ ...f, motivo: e.target.value }))}
                    placeholder="Razón del préstamo"
                  />
                </label>
                <label className="field">
                  <span>Fecha límite (opcional)</span>
                  <input
                    type="date"
                    value={prestamoSectionForm.fecha_fin}
                    onChange={(e) => setPrestamoSectionForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                  />
                </label>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Registrar préstamo</button>
                </div>
              </form>
            </section>
          )}

          <section className="panel">
            <div className="panel-header">
              <h3 style={{ margin: 0 }}>Equipos en préstamo ({prestados.length})</h3>
              <button type="button" className="btn-quick-status" onClick={() => setPrestamoSectionForm({ equipo_id: '', prestamo_a: '', motivo: '', fecha_fin: '' })}>Nuevo</button>
            </div>
            {prestados.length === 0 ? (
              <p className="text-soft" style={{ fontSize: '0.9rem', padding: '8px 0' }}>No hay equipos en préstamo actualmente.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Prestado a</th>
                      <th>Desde</th>
                      <th>Límite</th>
                      <th>Estado</th>
                      {canModify && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {prestados.map((eq) => {
                      const vencido = eq.prestamo_hasta && new Date(eq.prestamo_hasta) < new Date()
                      return (
                        <tr key={eq.id}>
                          <td data-label="Equipo">
                            <button type="button" className="link-button" onClick={() => handleOpenEquipmentDetail(eq)}>
                              <strong>{eq.folio}</strong>
                            </button>
                            <span className="text-soft" style={{ display: 'block', fontSize: '0.78rem' }}>{eq.marca} {eq.modelo}</span>
                            {eq.serie && <span className="text-soft" style={{ display: 'block', fontSize: '0.72rem' }}>S/N: {eq.serie}</span>}
                          </td>
                          <td data-label="Prestado a">{eq.prestamo_a || '—'}</td>
                          <td data-label="Desde">{eq.prestamo_desde ? new Date(eq.prestamo_desde).toLocaleDateString('es-CO') : '—'}</td>
                          <td data-label="Límite">{eq.prestamo_hasta ? new Date(eq.prestamo_hasta).toLocaleDateString('es-CO') : '—'}</td>
                          <td data-label="Estado">
                            {vencido ? (
                              <span className="badge-danger">VENCIDO</span>
                            ) : (
                              <span className="status-pill prestamo">Préstamo</span>
                            )}
                          </td>
                          {canModify && (
                            <td data-label="Acciones">
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button type="button" className="link-button" onClick={() => handleRetornoPrestamo(eq)}>Retorno</button>
                                <button type="button" className="link-button" onClick={() => handleAbrirTraspaso(eq)}>Traspasar</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )
    }

    if (activeSection === 'puntos') {
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Farmacias / Sedes</h2>
              {canAdmin && (
                <button type="button" className="btn-primary small" onClick={abrirPuntoCrear}>
                  Nueva sede
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 16px' }}>
              Sedes a las que el área de sistemas les envía y recibe equipos, y cuyos equipos se mantienen.
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Ciudad</th>
                    <th>Dirección</th>
                    <th>Teléfono</th>
                    <th>Resp. / Coordinador</th>
                    <th>Celular</th>
                    <th>Estado</th>
                    {canAdmin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {puntos.length === 0 && (
                    <tr><td colSpan="100%" data-label="Sedes"><em>No hay sedes registradas. Crea la primera con el botón "Nueva sede".</em></td></tr>
                  )}
                  {puntos.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Nombre"><strong>{p.nombre}</strong></td>
                      <td data-label="Tipo">{p.tipo || '—'}</td>
                      <td data-label="Ciudad">{p.ciudad || '—'}</td>
                      <td data-label="Dirección">{p.direccion || '—'}</td>
                      <td data-label="Teléfono">{p.telefono || '—'}</td>
                      <td data-label="Responsable">{p.responsable || '—'}</td>
                      <td data-label="Celular Coord.">{p.coordinador_celular || '—'}</td>
                      <td data-label="Estado">
                        <span className={`status-pill ${p.estado === 'activo' ? 'disponible' : 'baja'}`}>
                          {p.estado || '—'}
                        </span>
                      </td>
                      {canAdmin && (
                        <td data-label="Acciones">
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button type="button" className="link-button" onClick={() => abrirPuntoEditar(p)}>Editar</button>
                            <button type="button" className="link-button danger-text" onClick={() => handlePuntoEliminar(p)}>Eliminar</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {puntoModalOpen && (
            <div className="modal-overlay" onClick={() => setPuntoModalOpen(false)}>
              <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{puntoModalMode === 'editar' ? 'Editar sede' : 'Nueva sede'}</h3>
                    <span className="text-soft" style={{ fontSize: '0.8rem' }}>Farmacia o sede para envío/recepción de equipos</span>
                  </div>
                  <button type="button" className="btn-modal-close" onClick={() => setPuntoModalOpen(false)}>✕</button>
                </div>
                <form onSubmit={handlePuntoSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Nombre de la sede *</span>
                      <input
                        value={puntoForm.nombre}
                        onChange={(e) => setPuntoForm({ ...puntoForm, nombre: e.target.value })}
                        placeholder="Farmacia / Sede"
                      />
                    </label>
                    <label className="field">
                      <span>Tipo</span>
                      <select
                        value={puntoForm.tipo}
                        onChange={(e) => setPuntoForm({ ...puntoForm, tipo: e.target.value })}
                      >
                        <option value="drogueria">Droguería</option>
                        <option value="dispensario">Dispensario</option>
                        <option value="centro_costo">Centro de costo</option>
                        <option value="cedis">Cedis</option>
                        <option value="oficina">Oficina</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Ciudad</span>
                      <input
                        value={puntoForm.ciudad}
                        onChange={(e) => setPuntoForm({ ...puntoForm, ciudad: e.target.value })}
                        placeholder="Bogotá"
                      />
                    </label>
                    <label className="field">
                      <span>Dirección</span>
                      <input
                        value={puntoForm.direccion}
                        onChange={(e) => setPuntoForm({ ...puntoForm, direccion: e.target.value })}
                        placeholder="Calle / Carrera"
                      />
                    </label>
                    <label className="field">
                      <span>Teléfono</span>
                      <input
                        value={puntoForm.telefono}
                        onChange={(e) => setPuntoForm({ ...puntoForm, telefono: e.target.value })}
                        placeholder="Teléfono de contacto"
                      />
                    </label>
                    <label className="field">
                      <span>Responsable / Coordinador</span>
                      <input
                        value={puntoForm.responsable}
                        onChange={(e) => setPuntoForm({ ...puntoForm, responsable: e.target.value })}
                        placeholder="Nombre del responsable/coordinador"
                      />
                    </label>
                    <label className="field">
                      <span>Celular del coordinador</span>
                      <input
                        value={puntoForm.coordinador_celular}
                        onChange={(e) => setPuntoForm({ ...puntoForm, coordinador_celular: e.target.value })}
                        placeholder="Ej: 300 123 4567"
                      />
                    </label>
                    <label className="field">
                      <span>Estado</span>
                      <select
                        value={puntoForm.estado}
                        onChange={(e) => setPuntoForm({ ...puntoForm, estado: e.target.value })}
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </label>
                  </div>
                  <div className="modal-footer" style={{ borderTop: 'none', padding: '14px 0 0' }}>
                    <button type="submit" className="btn-primary">{puntoModalMode === 'editar' ? 'Guardar cambios' : 'Crear sede'}</button>
                    <button type="button" className="btn-outline" onClick={() => setPuntoModalOpen(false)}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )
    }

    if (activeSection === 'configuracion') {
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Configuración</h2>
              <button type="button" className="btn-primary small" onClick={handleSaveConfig}>
                {configSaved ? 'Guardado ✓' : 'Guardar'}
              </button>
            </div>

            {/* Conexión con el servidor */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: 'var(--primary)' }}>
                Conexión con el servidor
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 12px' }}>
                URL pública del backend. Si cambia la dirección del túnel sin volver a desplegar, actualízala aquí
                (se guarda en este navegador).
              </p>
              <div className="form-grid">
                <label>
                  <span>URL del servidor</span>
                  <input
                    value={apiUrlDraft}
                    onChange={(e) => setApiUrlDraft(e.target.value)}
                    placeholder="https://local-tunel.trycloudflare.com"
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary small" onClick={handleSaveApiUrl}>
                  Guardar servidor
                </button>
                <button type="button" className="btn-outline small" onClick={handleResetApiUrl}>
                  Restablecer a valor del build
                </button>
              </div>
            </div>

            {/* Ajustes de la aplicación */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: 'var(--primary)' }}>
                Ajustes de la aplicación
              </h3>
              <div className="form-grid">
                <label>
                  <span>Nombre del sistema</span>
                  <input
                    value={appSettings.sistemaNombre || 'INV - Sistemas'}
                    onChange={(e) => setAppSettings((s) => ({ ...s, sistemaNombre: e.target.value }))}
                    placeholder="INV - Sistemas"
                  />
                </label>
                <label>
                  <span>Nombre de la empresa</span>
                  <input
                    value={appSettings.empresaNombre || ''}
                    onChange={(e) => setAppSettings((s) => ({ ...s, empresaNombre: e.target.value }))}
                    placeholder="Sistemas Bogotá"
                  />
                </label>
                <label>
                  <span>Moneda / símbolo</span>
                  <input
                    value={appSettings.moneda || '$'}
                    onChange={(e) => setAppSettings((s) => ({ ...s, moneda: e.target.value }))}
                    placeholder="$"
                  />
                </label>
                <label>
                  <span>Tema por defecto</span>
                  <select
                    value={appSettings.tema || 'light'}
                    onChange={(e) => setAppSettings((s) => ({ ...s, tema: e.target.value }))}
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                  </select>
                </label>
                <label>
                  <span>Días aviso mantenimiento</span>
                  <input
                    type="number"
                    value={appSettings.diasAviso || '7'}
                    onChange={(e) => setAppSettings((s) => ({ ...s, diasAviso: e.target.value }))}
                    placeholder="7"
                  />
                </label>
              </div>
            </div>

            {/* Catálogo: Categorías */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: 'var(--primary)' }}>
                Categorías de equipos
              </h3>
              {canModify ? (
                <form className="form-grid" onSubmit={handleCategoriaSubmit}>
                  <label>
                    <span>Nombre</span>
                    <input
                      value={categoriaForm.nombre}
                      onChange={(event) => setCategoriaForm({ ...categoriaForm, nombre: event.target.value })}
                      placeholder="Cómputo"
                    />
                  </label>
                  <label>
                    <span>Descripción</span>
                    <input
                      value={categoriaForm.descripcion}
                      onChange={(event) => setCategoriaForm({ ...categoriaForm, descripcion: event.target.value })}
                      placeholder="Portátiles, PC de escritorio"
                    />
                  </label>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary small">Agregar categoría</button>
                  </div>
                </form>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 14px' }}>
                  Tu rol ({currentUser?.rol}) es de solo lectura.
                </p>
              )}
              <div className="chip-list">
                {categorias.map((cat) => (
                  <span key={cat.id} className="chip">
                    {cat.nombre}
                    {canModify && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
                            handleDeleteCategoria(cat.id, cat.nombre)
                          }
                        }}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Catálogo: Ubicaciones */}
            <div>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: 'var(--primary)' }}>
                Ubicaciones y bodegas
              </h3>
              {canModify ? (
                <form className="form-grid" onSubmit={handleUbicacionSubmit}>
                  <label>
                    <span>Nombre</span>
                    <input
                      value={ubicacionForm.nombre}
                      onChange={(event) => setUbicacionForm({ ...ubicacionForm, nombre: event.target.value })}
                      placeholder="Bodega Central"
                    />
                  </label>
                  <label>
                    <span>Ciudad</span>
                    <input
                      value={ubicacionForm.ciudad}
                      onChange={(event) => setUbicacionForm({ ...ubicacionForm, ciudad: event.target.value })}
                      placeholder="Bogotá"
                    />
                  </label>
                  <label>
                    <span>Dirección</span>
                    <input
                      value={ubicacionForm.direccion}
                      onChange={(event) => setUbicacionForm({ ...ubicacionForm, direccion: event.target.value })}
                      placeholder="Calle 26 N 68C-61"
                    />
                  </label>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary small">Agregar ubicación</button>
                  </div>
                </form>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 14px' }}>
                  Tu rol ({currentUser?.rol}) es de solo lectura.
                </p>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Ciudad</th>
                      <th>Dirección</th>
                      {canModify && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ubicaciones.map((u) => (
                      <tr key={u.id}>
                        <td data-label="Nombre">{u.nombre}</td>
                        <td data-label="Ciudad">{u.ciudad || '—'}</td>
                        <td data-label="Dirección">{u.direccion || '—'}</td>
                        {canModify && (
                          <td data-label="Acciones">
                            <button
                              type="button"
                              className="link-button"
                              style={{ color: 'var(--danger, #c62828)' }}
                              onClick={() => {
                                if (window.confirm(`¿Eliminar la ubicación "${u.nombre}"?`)) {
                                  handleDeleteUbicacion(u.id, u.nombre)
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notificaciones por correo / WhatsApp */}
            <div style={{ margin: '28px 0' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: 'var(--primary)' }}>
                Notificaciones (correo / WhatsApp)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '0 0 12px' }}>
                Envía un resumen automático de garantías, mantenimientos pendientes y actas sin firmar a los
                responsables configurados.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-quick-status" onClick={handleEnviarCorreo}>
                  Enviar resumen por correo
                </button>
                <button type="button" className="btn-primary" onClick={handleEnviarWhatsApp}>
                  Enviar resumen por WhatsApp
                </button>
              </div>
            </div>

            {/* Resumen de parámetros */}
            <div className="mini-grid" style={{ marginTop: '28px' }}>
              <div className="action-card">
                <strong>{new Set(usuarios.map((u) => u.rol)).size}</strong>
                <span>Roles activos en uso</span>
              </div>
              <div className="action-card">
                <strong>{categorias.length}</strong>
                <span>Categorías del sistema</span>
              </div>
              <div className="action-card">
                <strong>{ubicaciones.length}</strong>
                <span>Ubicaciones configuradas</span>
              </div>
            </div>
          </article>
        </section>
      )
    }

    return (
      <>
        {((stats?.alertas?.vencidas > 0) || (stats?.alertas?.proximas > 0)) && (
          <div className="maintenance-alert-banner" onClick={() => setActiveSection('mantenimiento')}>
            <div className="alert-content">
              <strong>⚠️ Alerta de Mantenimientos:</strong>
              {stats.alertas.vencidas > 0 && (
                <span className="badge-danger">
                  {stats.alertas.vencidas} vencido{stats.alertas.vencidas > 1 ? 's' : ''}
                </span>
              )}
              {stats.alertas.proximas > 0 && (
                <span className="badge-warning">
                  {stats.alertas.proximas} próximo{stats.alertas.proximas > 1 ? 's' : ''} en 7 días
                </span>
              )}
              <span style={{ marginLeft: 'auto', textDecoration: 'underline', fontSize: '0.82rem' }}>
                Ver Mantenimiento →
              </span>
            </div>
          </div>
        )}

        {categorias.length === 0 && canModify && (
          <div className="seed-banner">
            <div className="seed-banner-text">
              <h4>🚀 Configura tu inventario en 1 clic</h4>
              <p>Tu sistema está listo. Carga las categorías y ubicaciones por defecto para empezar a registrar equipos.</p>
            </div>
            <button type="button" className="btn-primary small" onClick={handleSeedCatalogos}>
              Cargar Catálogos Iniciales
            </button>
          </div>
        )}

        <section className="stats-grid">
          {Object.entries(stats.totales).map(([key, value]) => (
            <article key={key} className="stat-card">
              <span>{statLabels[key] || key}</span>
              <strong>{value}</strong>
              <small>{stats.mes}</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel large-panel">
            <div className="panel-header">
              <h2>Inventario reciente</h2>
              <button type="button" className="link-button" onClick={() => setActiveSection('equipos')}>
                Ver todos ({equipos.length})
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Equipo</th>
                    <th>Modelo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.length ? (
                    equipos.slice(0, 10).map((equipo) => (
                      <tr key={equipo.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenEquipmentDetail(equipo)}>
                        <td>
                          <span className="badge-numero">{equipo.folio}</span>
                        </td>
                        <td>
                          <div className="equipment-cell">
                            <div className="equipment-avatar">
                              {equipo.foto ? (
                                <img src={`${API_BASE}${equipo.foto}`} alt="" className="equipment-avatar-img" />
                              ) : (
                                <span style={{ fontSize: '0.9rem' }}>💻</span>
                              )}
                            </div>
                            <span>{equipo.marca}</span>
                          </div>
                        </td>
                        <td>{equipo.modelo}</td>
                        <td>
                          <span className={`status-pill ${equipo.estado}`}>{equipo.estado}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-row">
                        No hay equipos registrados en el inventario. Agrega uno o carga catálogos iniciales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel side-panel">
            <div className="panel-header">
              <h2>Resumen</h2>
            </div>

            <div className="summary-list">
              <div className="summary-item">
                <span>Activos en Operación</span>
                <strong>{stats.totales.disponibles + stats.totales.asignados}</strong>
              </div>
              <div className="summary-item">
                <span>Mantenimientos</span>
                <strong style={{ color: stats?.alertas?.vencidas > 0 ? 'var(--danger)' : 'inherit' }}>
                  {stats.mantenimientos_activos || 0} activos
                </strong>
              </div>
              <div className="summary-item">
                <span>Actas emitidas</span>
                <strong>{stats.actas_generadas || 0}</strong>
              </div>
              <div className="summary-item">
                <span>Mes actual</span>
                <strong>{stats.mes}</strong>
              </div>
              <div className="summary-item">
                <span>Estado general</span>
                <strong style={{ color: 'var(--success)' }}>Operativo</strong>
              </div>
            </div>
          </article>
        </section>
      </>
    )
  }

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="brand-block login-logo" style={{ justifyContent: 'center', marginBottom: '18px', paddingBottom: '18px' }}>
            <div className="brand-logo-full">
              <img src="/logo_eticos.jpg" alt="Sistemas Bogotá" className="brand-logo-img" />
            </div>
          </div>

          <h2 style={{ margin: '0 0 4px' }}>Iniciar sesión</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
            Ingresa con tu cuenta para acceder al inventario
          </p>

          <form className="form-grid" onSubmit={handleLogin}>
            <label>
              <span>Correo electrónico</span>
              <input
                type="email"
                autoComplete="username"
                autoFocus
                value={loginForm.correo}
                onChange={(e) => setLoginForm({ ...loginForm, correo: e.target.value })}
                placeholder="usuario@empresa.com"
              />
            </label>
            <label>
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </label>

            {loginError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={logging}>
                {logging ? 'Ingresando…' : 'Entrar'}
              </button>
            </div>
          </form>

          <details className="login-help" style={{ marginTop: '18px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.83rem', color: 'var(--brand)', textAlign: 'center' }}>
              ¿No sabes cómo entrar? Ver ayuda de acceso
            </summary>
            <div style={{ marginTop: '10px', fontSize: '0.84rem', color: 'var(--text-soft)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px' }}>Tu cuenta la crea el administrador del sistema. Si tu correo no funciona o aún no tienes cuenta, contacta al administrador.</p>
              <p style={{ margin: '0 0 10px' }}>
                Para probar con una cuenta de ejemplo, usa:
              </p>
              <button
                type="button"
                className="btn-outline"
                style={{ width: '100%' }}
                onClick={() => setLoginForm({ correo: 'admin@sistemasbogota.com', password: 'Admin2026!' })}
              >
                Llenar con cuenta de ejemplo
              </button>
            </div>
          </details>

          <p style={{ margin: '18px 0 0', fontSize: '0.75rem', color: 'var(--text-soft)', textAlign: 'center' }}>
            ¿Olvidaste tu contraseña? Solicítala al administrador.
          </p>
        </div>
        {/* Toasts handled by global container */}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="brand-logo-full">
            <img src="/logo_eticos.jpg" alt="Sistemas Bogotá" className="brand-logo-img" />
          </div>
        </div>
        <nav className="nav" aria-label="Navegación principal">
          {navItems
            .filter((item) => {
              if (item.id === 'usuarios') return currentUser?.rol === 'admin'
              return true
            })
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeSection === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setActiveSection(item.id);
                  setIsSidebarOpen(false);
                }}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title="Abrir/Cerrar menú"
          >
            <Icon name="menu" />
          </button>
          <div>
            <p className="eyebrow">Resumen general</p>
            <h1>{navItems.find((item) => item.id === activeSection)?.label || 'Dashboard'}</h1>
          </div>

          <div className="topbar-search">
            <div className="search-container">
              <Icon name="search" />
              <input
                type="text"
                placeholder="Buscar equipo (folio, serie, marca...)"
                value={searchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
              />
            </div>
            {isSearchOpen && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((eq) => (
                  <div
                    key={eq.id}
                    className="search-result-item"
                    onClick={() => {
                      setSelectedEquipmentForDetail(eq)
                      setIsDetailModalOpen(true)
                      setIsSearchOpen(false)
                      setSearchQuery('')
                    }}
                  >
                    <strong>{eq.folio}</strong>
                    <span>{eq.marca} {eq.modelo}</span>
                    <span className={`status-pill ${eq.estado}`}>{eq.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="topbar-actions">
            {currentUser && (
              <span className="user-chip" title={`Rol: ${currentUser.rol}`}>
                {currentUser.nombre} · {currentUser.rol}
              </span>
            )}
            <div style={{ position: 'relative' }} className="notif-wrap">
              <button
                type="button"
                className="link-button"
                onClick={() => { setNotifOpen((v) => !v); loadNotificaciones() }}
                title="Notificaciones"
                style={{ fontSize: '1.1rem', lineHeight: 1 }}
              >
                🔔
              </button>
              {(() => {
                const unread = notificaciones.filter((n) => !notifLeidas.includes(n.id)).length
                if (unread > 0) {
                  return (
                    <span
                      className="notif-badge"
                      style={{ position: 'absolute', top: '-6px', right: '-8px' }}
                    >
                      {unread}
                    </span>
                  )
                }
                return null
              })()}
              {notifOpen && (
                <div className="notif-popover">
                  <div className="notif-popover-header">
                    <strong>Notificaciones</strong>
                    <button type="button" className="link-button" style={{ fontSize: '0.72rem' }} onClick={() => setNotifOpen(false)}>
                      Cerrar
                    </button>
                  </div>
                  <div className="notif-list">
                    {notificaciones.length === 0 && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', margin: '6px 0' }}>
                        Sin notificaciones por ahora.
                      </p>
                    )}
                    {notificaciones.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotifRead(n.id)}
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: notifLeidas.includes(n.id) ? 'transparent' : 'rgba(134,59,255,.06)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{n.titulo}</strong>
                          <span className="status-pill" style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>
                            {n.nivel}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', margin: '3px 0 0', color: 'var(--text-soft)' }}>{n.mensaje}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="link-button"
              onClick={openScanner}
              title="Escanear código QR con la cámara"
            >
              📷 Escanear QR
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => { setShowHelp(true); setHelpStep(0) }}
              title="Guía de primeros pasos"
            >
              ❔ Ayuda
            </button>
            {canModify && (
              <button type="button" className="btn-primary" onClick={() => setActiveSection('entradas')}>
                Nuevo movimiento
              </button>
            )}
            <button type="button" className="btn-link-danger" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        {sectionHelp[activeSection] && (
          <div className="section-guide" style={{ marginBottom: '18px' }}>
            <div className="section-guide-head">
              <p>{sectionHelp[activeSection].resumen}</p>
              <button
                type="button"
                className="link-button"
                onClick={() => setGuideOpen((v) => !v)}
                style={{ flexShrink: 0 }}
              >
                {guideOpen ? 'Ocultar pasos' : '¿Cómo usar esta sección?'}
              </button>
            </div>
            {guideOpen && (
              <ol className="section-guide-steps">
                {sectionHelp[activeSection].pasos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {renderSectionContent()}

        {/* Toasts handled by global container */}
      </main>

      {/* MODAL: GUÍA DE PRIMEROS PASOS */}
      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <div className="help-progress">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i === helpStep ? 'active' : ''} />
              ))}
            </div>
            {helpStep === 0 && (
              <>
                <h3>Bienvenido a Inventario de Equipos</h3>
                <p>
                  Este sistema te permite controlar el inventario de tus equipos: registrarlos,
                  moverlos (entradas y salidas), programar mantenimientos, generar actas PDF y
                  hasta escanear sus códigos QR.
                </p>
              </>
            )}
            {helpStep === 1 && (
              <>
                <h3>1 · Registra y consulta equipos</h3>
                <p>
                  Entra a <strong>Stock</strong> (o <strong>Inventario</strong>) para ver todos los equipos,
                  buscarlos con el buscador de arriba o registrarlos con el botón <strong>+ Nuevo equipo</strong>.
                  Cada equipo puede tener folio, serie, fotos y un estado (Disponible, En uso, etc.).
                </p>
              </>
            )}
            {helpStep === 2 && (
              <>
                <h3>2 · Mueve equipos con actas</h3>
                <p>
                  Usa <strong>Entradas</strong> y <strong>Salidas</strong> para registrar entregas o devoluciones.
                  Cada movimiento genera una <strong>acta PDF</strong> que puedes imprimir o reenviar por correo.
                </p>
              </>
            )}
            {helpStep === 3 && (
              <>
                <h3>3 · Mantenimiento, QR y más</h3>
                <p>
                  Agenda <strong>mantenimientos</strong>, escanea el <strong>QR</strong> de un equipo (botón
                  «Escanear QR»), genera reportes y consulta el estado público de un folio desde la página
                  de consulta. Todo lo demás aparece en el menú lateral.
                </p>
              </>
            )}
            <div className="help-actions">
              {helpStep > 0 && (
                <button type="button" className="btn-outline" onClick={() => setHelpStep((s) => s - 1)}>
                  Anterior
                </button>
              )}
              {helpStep < 3 ? (
                <button type="button" className="btn-primary" onClick={() => setHelpStep((s) => s + 1)}>
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { setShowHelp(false); localStorage.setItem('inv_help', '1') }}
                >
                  ¡Empezar a usar!
                </button>
              )}
            </div>
            <label className="help-skip" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                onChange={(e) => { if (e.target.checked) localStorage.setItem('inv_help', '1') }}
                style={{ marginRight: '5px' }}
              />
              No volver a mostrar la guía
            </label>
          </div>
        </div>
      )}

      {/* MODAL: VISOR DE ACTA OFICIAL */}
      {isViewModalOpen && selectedActa && (
        <div className="acta-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="acta-preview-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Icon name="fileText" />
                Vista previa del acta: {selectedActa.numero} ({selectedActa.tipo})
              </h3>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-acta-view"
                  onClick={() => handleOpenActaPDF(selectedActa.id)}
                >
                  <Icon name="download" /> Abrir PDF Oficial
                </button>
                <button
                  type="button"
                  className="btn-acta-view"
                  style={{ background: 'var(--accent)', color: 'white' }}
                  onClick={() => {
                    const verifyUrl = `${API_BASE}/api/reports/actas/${selectedActa.id}/verify`;
                    window.open(verifyUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <Icon name="eye" /> Verificar
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="modal-body">
              <div className="acta-sheet-doc">
                <div className="acta-watermark-bg">SISTEMAS BOGOTA</div>

                <div className="acta-doc-top">
                  <div className="acta-doc-brand">
                    <div className="acta-doc-logo">
<img src="/logo_eticos.jpg" alt="Logo" className="brand-logo-img" />
                    </div>
                    <div className="acta-doc-company">
                      <h4>SISTEMAS BOGOTA</h4>
                      <p>NIT: 892300678-1 • TEL: 3157736033</p>
                      <p>CALLE 26 N 68C-61 BOGOTA D.C.</p>
                    </div>
                  </div>
                  <div className="acta-doc-box">
                    <strong>{selectedActa.tipo} N° {selectedActa.numero}</strong>
                    <span>
                      {selectedActa.created_at
                        ? new Date(selectedActa.created_at).toLocaleString('es-CO')
                        : new Date().toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                <div className="acta-doc-title">
                  <h2>
                    {selectedActa.tipo === 'SALIDA' ? 'ORDEN DE SALIDA' : 'ORDEN DE ENTRADA'}
                  </h2>
                </div>

                <div className="acta-doc-auth">
                  POR MEDIO DE LA PRESENTE, SE AUTORIZA A{' '}
                  <u style={{ fontWeight: 800 }}>{selectedActa.entregado_por?.toUpperCase()}</u>,{' '}
                  {selectedActa.tipo === 'SALIDA' ? 'EL ENVÍO DESDE' : 'LA RECEPCIÓN EN'}{' '}
                  SISTEMAS BOGOTA. LOS EQUIPOS DE TRABAJO RELACIONADOS A CONTINUACIÓN AL SIGUIENTE DESTINO:
                </div>

                <div className="acta-doc-grid-info">
                  <div>
                    <span>Proyecto / Centro de Costo</span>
                    <strong>{(selectedActa.proyecto || 'General').toUpperCase()}</strong>
                  </div>
                  <div>
                    <span>Ciudad Destino</span>
                    <strong>{(selectedActa.ciudad_destino || 'Bogotá').toUpperCase()}</strong>
                  </div>
                  <div>
                    <span>Responsable Destino</span>
                    <strong>{(selectedActa.responsable_destino || 'Receptor Asignado').toUpperCase()}</strong>
                  </div>
                  <div>
                    <span>Dirección Destino</span>
                    <strong>{(selectedActa.direccion_destino || 'Sede Destino').toUpperCase()}</strong>
                  </div>
                </div>

                <table className="acta-doc-table">
                  <thead>
                    <tr>
                      <th>DISPOSITIVO</th>
                      <th>MARCA</th>
                      <th>DETALLE</th>
                      <th style={{ textAlign: 'center' }}>CANT</th>
                      <th>SERIAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedActa.items && selectedActa.items.length ? (
                      selectedActa.items.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.dispositivo}</strong></td>
                          <td>{it.marca || '—'}</td>
                          <td>{it.detalle || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{it.cantidad || 1}</td>
                          <td><code>{it.serial || 'S/N'}</code></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '12px' }}>
                          Dispositivos relacionados según orden física
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="acta-doc-notes">
                  <strong>OBSERVACIONES:</strong>{' '}
                  {selectedActa.observaciones ? selectedActa.observaciones.toUpperCase() : 'SIN OBSERVACIONES.'}
                </div>

                {selectedActa.fotos && selectedActa.fotos.length > 0 && (
                  <div className="acta-doc-photos">
                    <strong>EVIDENCIA FOTOGRÁFICA:</strong>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {selectedActa.fotos.map((foto, idx) => (
                        <a key={idx} href={`${API_BASE}${foto}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`${API_BASE}${foto}`}
                            alt={`Foto ${idx + 1}`}
                            style={{ width: '110px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="acta-doc-metrics">
                  <div className="acta-doc-badge-val">
                    VALOR APROX : $ {selectedActa.valor_aprox ? Number(selectedActa.valor_aprox).toLocaleString('es-CO') : '0'}
                  </div>
                  <div className="acta-doc-badge-val" style={{ background: '#334155' }}>
                    CAJAS : {selectedActa.cajas || 1}
                  </div>
                </div>

                <div className="acta-doc-signatures">
                  <div className="acta-doc-sig-box">
                    <div className="acta-doc-sig-line"></div>
                    <strong>{selectedActa.entregado_por?.toUpperCase()}</strong>
                    <small>AUTORIZA / ENTREGA</small>
                    <div className="acta-doc-sig-bar">SISTEMAS BOGOTA</div>
                  </div>
                  <div className="acta-doc-sig-box">
                    <div className="acta-doc-sig-line"></div>
                    <strong>DESPACHO BODEGA</strong>
                    <small>RESPONSABLE DE ENVÍO</small>
                    <div className="acta-doc-sig-bar">
                      BODEGA {(selectedActa.ciudad_destino || 'BOGOTA').toUpperCase()}
                    </div>
                  </div>
                </div>

                {selectedActa.firmado_por && (
                  <div className="acta-doc-signed-stamp">
                    <div className="acta-signed-title">RECIBIDO CONFORME</div>
                    <div className="acta-signed-line"></div>
                    <strong>{String(selectedActa.firmado_por).toUpperCase()}</strong>
                    <small>C.C. / DOC: {selectedActa.documento_firma}</small>
                    <small>FECHA: {selectedActa.fecha_firma ? new Date(selectedActa.fecha_firma).toLocaleString('es-CO') : '—'}</small>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {selectedActa.firmado_por && (
                <span className="ticket-pill" style={{ color: 'var(--success)', background: 'transparent', alignSelf: 'center' }}>
                  ✓ Firmada por {selectedActa.firmado_por} ({selectedActa.documento_firma})
                </span>
              )}
              {canModify && !selectedActa.firmado_por && (
                <button
                  type="button"
                  className="btn-quick-status"
                  style={{ color: 'var(--success)' }}
                  onClick={() => setFirmaModalOpen(true)}
                >
                  ✍ Firmar acta (recibido conforme)
                </button>
              )}
              <button
                type="button"
                className="link-button"
                onClick={() => setIsViewModalOpen(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleOpenActaPDF(selectedActa.id)}
              >
                <Icon name="download" /> Descargar PDF Oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIRMA DE ACTA (RECIBIDO CONFORME) */}
      {firmaModalOpen && selectedActa && (
        <div className="modal-overlay" onClick={() => setFirmaModalOpen(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>✍ Firmar acta {selectedActa.numero}</h3>
                <span className="text-soft" style={{ fontSize: '0.8rem' }}>
                  Registro de recibido conforme y firma digital de la orden
                </span>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setFirmaModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleFirmarActa} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label className="field">
                <span>Nombre de quien firma (recibe / entrega) *</span>
                <input
                  type="text"
                  value={firmaActaForm.nombre}
                  onChange={(e) => setFirmaActaForm({ ...firmaActaForm, nombre: e.target.value })}
                  placeholder="Ej. Carlos Restrepo"
                />
              </label>
              <label className="field">
                <span>Documento de identidad *</span>
                <input
                  type="text"
                  value={firmaActaForm.documento}
                  onChange={(e) => setFirmaActaForm({ ...firmaActaForm, documento: e.target.value })}
                  placeholder="C.C."
                />
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '6px 0 0' }}>
                Al confirmar, el PDF oficial del acta se regenerará incluyendo el bloque «RECIBIDO CONFORME».
              </p>
              <div className="modal-footer" style={{ borderTop: 'none', padding: '14px 0 0' }}>
                <button type="button" className="btn-quick-status" onClick={() => setFirmaModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary small" disabled={firmaAplicando}>
                  {firmaAplicando ? 'Firmando…' : 'Confirmar firma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR NUEVA ACTA OFICIAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Icon name="upload" />
                Emitir Nueva Acta Oficial (Salida / Entrada)
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateActaSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
                <div className="form-grid">
                  <label>
                    <span>Tipo de Acta</span>
                    <select
                      value={createActaForm.tipo}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, tipo: e.target.value })}
                    >
                      <option value="SALIDA">SALIDA (Despacho / Asignación de equipos)</option>
                      <option value="ENTRADA">ENTRADA (Reingreso / Recepción de activos)</option>
                    </select>
                  </label>

                  <label>
                    <span>Autorizado / Entregado Por *</span>
                    <input
                      required
                      value={createActaForm.entregado_por}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, entregado_por: e.target.value })}
                      placeholder="Ej. Ing. Enrique Escorcia"
                    />
                  </label>

                  <label>
                    <span>Proyecto / Centro de Costo</span>
                    <input
                      value={createActaForm.proyecto}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, proyecto: e.target.value })}
                      placeholder="Ej. IMPLEMENTACION SEDE NORTE"
                    />
                  </label>

                  <label>
                    <span>Responsable en Destino</span>
                    <input
                      value={createActaForm.responsable_destino}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, responsable_destino: e.target.value })}
                      placeholder="Ej. Carlos Restrepo - Coord. TI"
                    />
                  </label>

                  <label>
                    <span>Ciudad Destino</span>
                    <input
                      value={createActaForm.ciudad_destino}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, ciudad_destino: e.target.value })}
                      placeholder="Bogotá"
                    />
                  </label>

                  <label>
                    <span>Dirección Destino</span>
                    <input
                      value={createActaForm.direccion_destino}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, direccion_destino: e.target.value })}
                      placeholder="Cra 45 # 103-20"
                    />
                  </label>

                  <label>
                    <span>Valor Aproximado ($)</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={createActaForm.valor_aprox}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, valor_aprox: e.target.value })}
                      placeholder="Ej. 4500000"
                    />
                  </label>

                  <label>
                    <span>Número de Cajas</span>
                    <input
                      type="number"
                      min="1"
                      value={createActaForm.cajas}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, cajas: e.target.value })}
                    />
                  </label>

                  <label style={{ gridColumn: '1 / -1' }}>
                    <span>Observaciones</span>
                    <input
                      value={createActaForm.observaciones}
                      onChange={(e) => setCreateActaForm({ ...createActaForm, observaciones: e.target.value })}
                      placeholder="Notas sobre el estado físico, accesorios o motivo..."
                    />
                  </label>

                  <div style={{ gridColumn: '1 / -1', padding: '14px', background: 'rgba(33,150,243,0.06)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>📷 Fotos de la entrada/salida (opcional)</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '4px 0 10px' }}>
                      Adjunta hasta 3 fotografías como evidencia (estado del equipo, empaque, entrega).
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, 3)
                        setCreateActaForm((f) => ({ ...f, fotos: files }))
                      }}
                    />
                    {createActaForm.fotos.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {createActaForm.fotos.map((fl, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '8px' }}>
                            {fl.name}
                            <button
                              type="button"
                              className="link-button danger-text"
                              onClick={() => setCreateActaForm((f) => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx) }))}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selección rápida desde el stock disponible */}
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '0.92rem' }}>📦 Agregar equipo desde Stock disponible:</strong>
                    <select
                      className="filter-select"
                      style={{ maxWidth: '320px' }}
                      onChange={(e) => {
                        const eqId = Number(e.target.value)
                        if (!eqId) return
                        const selectedEq = equipos.find((eq) => eq.id === eqId)
                        if (selectedEq) {
                          setCreateActaForm((prev) => ({
                            ...prev,
                            items: [
                              ...prev.items.filter((it) => it.dispositivo.trim()),
                              {
                                dispositivo: `${selectedEq.marca} ${selectedEq.modelo}`,
                                marca: selectedEq.marca,
                                detalle: `Folio: ${selectedEq.folio}`,
                                cantidad: 1,
                                serial: selectedEq.serie || 'S/N',
                                equipo_id: selectedEq.id,
                              },
                            ],
                          }))
                          showToast(`Añadido: ${selectedEq.folio}`)
                        }
                        e.target.value = ''
                      }}
                    >
                      <option value="">-- Seleccionar de stock --</option>
                      {equipos
                        .filter((eq) => eq.estado === 'disponible')
                        .map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.folio} - {eq.marca} {eq.modelo} ({eq.serie || 'S/N'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <strong style={{ display: 'block', margin: '12px 0 8px', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                    Dispositivos a incluir en el acta ({createActaForm.items.length}):
                  </strong>

                  {createActaForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr 2fr 1fr 2fr auto',
                        gap: '8px',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <input
                        placeholder="Dispositivo (ej. Portátil)"
                        value={item.dispositivo}
                        onChange={(e) => {
                          const newItems = [...createActaForm.items]
                          newItems[idx].dispositivo = e.target.value
                          setCreateActaForm({ ...createActaForm, items: newItems })
                        }}
                      />
                      <input
                        placeholder="Marca"
                        value={item.marca}
                        onChange={(e) => {
                          const newItems = [...createActaForm.items]
                          newItems[idx].marca = e.target.value
                          setCreateActaForm({ ...createActaForm, items: newItems })
                        }}
                      />
                      <input
                        placeholder="Detalle / Modelo"
                        value={item.detalle}
                        onChange={(e) => {
                          const newItems = [...createActaForm.items]
                          newItems[idx].detalle = e.target.value
                          setCreateActaForm({ ...createActaForm, items: newItems })
                        }}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={item.cantidad}
                        onChange={(e) => {
                          const newItems = [...createActaForm.items]
                          newItems[idx].cantidad = e.target.value
                          setCreateActaForm({ ...createActaForm, items: newItems })
                        }}
                      />
                      <input
                        placeholder="Serial"
                        value={item.serial}
                        onChange={(e) => {
                          const newItems = [...createActaForm.items]
                          newItems[idx].serial = e.target.value
                          setCreateActaForm({ ...createActaForm, items: newItems })
                        }}
                      />
                      <button
                        type="button"
                        className="link-button"
                        style={{ color: 'var(--danger)', padding: '6px' }}
                        title="Eliminar fila"
                        onClick={() => {
                          const newItems = createActaForm.items.filter((_, i) => i !== idx)
                          setCreateActaForm({
                            ...createActaForm,
                            items: newItems.length
                              ? newItems
                              : [{ dispositivo: '', marca: '', detalle: '', cantidad: 1, serial: '', equipo_id: null }],
                          })
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="link-button"
                    style={{ marginTop: '6px', fontSize: '0.85rem' }}
                    onClick={() =>
                      setCreateActaForm({
                        ...createActaForm,
                        items: [
                          ...createActaForm.items,
                          { dispositivo: '', marca: '', detalle: '', cantidad: 1, serial: '', equipo_id: null },
                        ],
                      })
                    }
                  >
                    + Agregar otra fila manual
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Generar y Emitir Acta Oficial en PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle e Historial de Equipo */}
      {isDetailModalOpen && selectedEquipmentForDetail && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge-numero">{selectedEquipmentForDetail.folio}</span>
                <h3 style={{ margin: '4px 0 0' }}>
                  {selectedEquipmentForDetail.marca} {selectedEquipmentForDetail.modelo}
                </h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDetailModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-photo-card">
                  {selectedEquipmentForDetail.foto ? (
                    <img
                      src={`${API_BASE}${selectedEquipmentForDetail.foto}`}
                      alt={selectedEquipmentForDetail.modelo}
                      className="detail-photo-img"
                    />
                  ) : (
                    <div className="detail-photo-placeholder">
                      <span>Sin fotografía</span>
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <img
                      src={`${API_BASE}/api/inventory/equipos/${selectedEquipmentForDetail.id}/qr`}
                      alt="QR"
                      width="100"
                      height="100"
                      style={{ background: '#fff', padding: '4px', borderRadius: '8px' }}
                    />
                    <div style={{ marginTop: '6px' }}>
                      <button
                        type="button"
                        className="link-button"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => {
                          const url = `${API_BASE}/api/inventory/equipos/${selectedEquipmentForDetail.id}/qr`
                          window.open(url, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        Abrir QR completo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="detail-info-list">
                  <div className="detail-field">
                    <span>Estado</span>
                    <span className={`status-pill ${selectedEquipmentForDetail.estado}`}>
                      {selectedEquipmentForDetail.estado}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span>N° Serie</span>
                    <strong>{selectedEquipmentForDetail.serie || 'Sin número de serie'}</strong>
                  </div>
                  <div className="detail-field">
                    <span>Categoría</span>
                    <strong>{selectedEquipmentForDetail.categoria_nombre || 'General'}</strong>
                  </div>
                  <div className="detail-field">
                    <span>Ubicación</span>
                    <strong>{selectedEquipmentForDetail.ubicacion_nombre || selectedEquipmentForDetail.ubicacion || 'Bodega'}</strong>
                  </div>
                  <div className="detail-field">
                    <span>Valor Aproximado</span>
                    <strong>
                      {selectedEquipmentForDetail.valor_aprox
                        ? `$ ${Number(selectedEquipmentForDetail.valor_aprox).toLocaleString('es-CO')}`
                        : 'No registrado'}
                    </strong>
                  </div>
                  <div className="detail-field">
                    <span>Fecha de Registro</span>
                    <strong>
                      {selectedEquipmentForDetail.created_at
                        ? new Date(selectedEquipmentForDetail.created_at).toLocaleString('es-CO')
                        : '—'}
                    </strong>
                  </div>
                  <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                    <span>Observaciones</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-soft)', fontSize: '0.88rem' }}>
                      {selectedEquipmentForDetail.observaciones || 'Sin observaciones registradas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>
                  📋 Historial de Movimientos y Trazabilidad ({equipmentHistory.length})
                </h4>

                {equipmentHistory.length ? (
                  <div className="timeline-wrap">
                    {equipmentHistory.map((m) => (
                      <div key={m.id} className={`timeline-item ${m.tipo}`}>
                        <div className="timeline-dot" />
                        <div className="timeline-head">
                          <span className="timeline-tag">{m.tipo}</span>
                          <span className="timeline-date">
                            {m.created_at ? new Date(m.created_at).toLocaleString('es-CO') : ''}
                          </span>
                          {m.folio_acta && (
                            <span className="badge-numero" style={{ fontSize: '0.75rem', padding: '1px 6px' }}>
                              Acta {m.folio_acta}
                            </span>
                          )}
                        </div>
                        <div className="timeline-body">
                          {m.motivo && <div>{m.motivo}</div>}
                          {m.persona && (
                            <small style={{ color: 'var(--text-soft)', display: 'block' }}>
                              Responsable: {m.persona}
                            </small>
                          )}
                          {m.estado_anterior && m.estado_nuevo && (
                            <small style={{ color: 'var(--primary)', display: 'block', marginTop: '2px' }}>
                              Transición: {m.estado_anterior} → {m.estado_nuevo}
                            </small>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '8px 0 0' }}>
                    No hay movimientos registrados para este equipo todavía.
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>
                  📎 Adjuntos del equipo ({adjuntosEquipo.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
                  {adjuntosEquipo.map((a) => (
                    <div key={a.id} style={{ textAlign: 'center' }}>
                      {a.url && /\.(jpg|jpeg|png|webp)$/i.test(a.url) ? (
                        <img
                          src={`${API_BASE}${a.url}`}
                          alt="adjunto"
                          className="photo-preview-img"
                          style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                        />
                      ) : (
                        <a className="link-button small" href={`${API_BASE}${a.url}`} target="_blank" rel="noreferrer">
                          {a.url.split('/').pop()}
                        </a>
                      )}
                      {canModify && (
                        <button type="button" className="link-button small" style={{ color: 'var(--danger)', display: 'block', margin: '4px auto 0' }} onClick={() => borrarAdjunto(a, () => abrirAdjuntosEquipo(selectedEquipmentForDetail.id))}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
                  {!adjuntosEquipo.length && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Sin adjuntos registrados para este equipo.</p>
                  )}
                </div>
                {canModify && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      ref={adjuntosInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => subirAdjuntoEquipo(e, selectedEquipmentForDetail.id)}
                    />
                    <button type="button" className="btn-quick-status" disabled={adjuntosUploading} onClick={() => adjuntosInputRef.current && adjuntosInputRef.current.click()}>
                      {adjuntosUploading ? 'Subiendo…' : '➕ Subir adjunto'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {canModify && (
                <button
                  type="button"
                  className="btn-quick-status"
                  onClick={() => {
                    handleIncludeInActa(selectedEquipmentForDetail)
                    setIsDetailModalOpen(false)
                  }}
                >
                  + Emitir Acta con este equipo
                </button>
              )}
              {canModify && selectedEquipmentForDetail?.estado === 'disponible' && (
                <>
                  <button
                    type="button"
                    className="btn-quick-status"
                    onClick={() => {
                      setBajaPrestamoForm({ motivo: '', precio_venta: '', prestamo_a: '', fecha_fin: '' })
                      setBajaPrestamoModal({ tipo: 'prestamo', equipo: selectedEquipmentForDetail })
                    }}
                  >
                    🔁 Prestar
                  </button>
                  <button
                    type="button"
                    className="btn-quick-status"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => {
                      setBajaPrestamoForm({ motivo: '', precio_venta: '', prestamo_a: '', fecha_fin: '' })
                      setBajaPrestamoModal({ tipo: 'baja', equipo: selectedEquipmentForDetail })
                    }}
                  >
                    ⤵ Baja
                  </button>
                  <button
                    type="button"
                    className="btn-quick-status"
                    style={{ color: 'var(--accent)' }}
                    onClick={() => {
                      setBajaPrestamoForm({ motivo: '', precio_venta: '', prestamo_a: '', fecha_fin: '' })
                      setBajaPrestamoModal({ tipo: 'venta', equipo: selectedEquipmentForDetail })
                    }}
                  >
                    💰 Venta
                  </button>
                </>
              )}
              {canModify && selectedEquipmentForDetail?.estado === 'prestamo' && (
                <button
                  type="button"
                  className="btn-quick-status"
                  onClick={() => handleRetornoPrestamo(selectedEquipmentForDetail)}
                >
                  ↺ Retorno de préstamo
                </button>
              )}
              {canModify && (
                <button
                  type="button"
                  className="btn-quick-status"
                  onClick={() => handleAbrirTraspaso(selectedEquipmentForDetail)}
                >
                  ↔ Traspasar
                </button>
              )}
              <button
                type="button"
                className="btn-primary small"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mtHistorialOpen && (
        <div className="modal-overlay" onClick={() => setMtHistorialOpen(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Historial del equipo</h3>
                <span className="text-soft" style={{ fontSize: '0.8rem' }}>Movimientos y mantenimientos</span>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setMtHistorialOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const mtosEquipo = mtHistorialEquipo
                  ? mantenimientos.filter((m) => String(m.equipo_id) === String(mtHistorialEquipo))
                  : []
                return (
                  <>
                    {mtosEquipo.length > 0 && (
                      <>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>Mantenimientos del equipo</h4>
                        <div className="timeline-list">
                          {mtosEquipo.map((m) => (
                            <div key={m.id} className="timeline-item">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                <strong style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                                  {m.tipo} · MT-{m.id}
                                </strong>
                                <small style={{ color: 'var(--text-soft)', fontSize: '0.75rem' }}>
                                  {m.created_at ? new Date(m.created_at).toLocaleString('es-CO') : ''}
                                </small>
                              </div>
                              {m.descripcion && <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>{m.descripcion}</div>}
                              <small style={{ display: 'block', color: 'var(--text-soft)', marginTop: '2px' }}>
                                Técnico: {m.tecnico || '—'} · Prioridad: {m.prioridad || 'media'}
                              </small>
                              <span className={`status-pill ${m.estado}`} style={{ marginTop: '4px' }}>{m.estado.replace('_', ' ')}</span>
                              {m.foto && (
                                <a href={`${API_BASE}${m.foto}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '4px' }}>
                                  <img src={`${API_BASE}${m.foto}`} alt="Evidencia" style={{ width: '80px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <h4 style={{ margin: '12px 0 8px', fontSize: '0.85rem' }}>Movimientos del equipo</h4>
                    {mtHistorial.length ? (
                      <div className="timeline-list">
                        {mtHistorial.map((m) => (
                          <div key={m.id} className="timeline-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                              <strong style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{m.tipo}</strong>
                              <small style={{ color: 'var(--text-soft)', fontSize: '0.75rem' }}>
                                {m.created_at ? new Date(m.created_at).toLocaleString('es-CO') : ''}
                              </small>
                            </div>
                            {m.motivo && <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>{m.motivo}</div>}
                            {m.persona && <small style={{ display: 'block', color: 'var(--text-soft)' }}>Por: {m.persona}</small>}
                            {m.estado_anterior && m.estado_nuevo && m.estado_anterior !== m.estado_nuevo && (
                              <small style={{ color: 'var(--primary)', display: 'block', marginTop: '2px' }}>
                                Transición: {m.estado_anterior} → {m.estado_nuevo}
                              </small>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '8px 0 0' }}>
                        No hay movimientos registrados para este equipo todavía.
                      </p>
                    )}
                  </>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary small" onClick={() => setMtHistorialOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESCÁNER QR (Lector Hardware) */}
      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Escanear QR / Código de Barras</h3>
                <span className="text-soft" style={{ fontSize: '0.8rem' }}>
                  Use el lector físico. El sistema procesará el código automáticamente al leerlo.
                </span>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setIsScannerOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleScannerSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⌨️</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: 0 }}>
                  {scannerStatus}
                </p>
              </div>
              <input
                ref={scannerInputRef}
                type="text"
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                autoFocus
                placeholder="Esperando lectura del lector..."
                style={{
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  border: '2px solid var(--primary)',
                  textAlign: 'center',
                  backgroundColor: 'var(--card, rgba(255,255,255,.02))',
                  color: 'var(--text)',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', textAlign: 'center', margin: 0 }}>
                El lector debe estar configurado para enviar "Enter" al final del escaneo.
              </p>
            </form>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary small"
                onClick={() => setIsScannerOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BAJA / VENTA / PRÉSTAMO (FASE 10) */}
      {bajaPrestamoModal && (
        <div className="modal-overlay" onClick={() => setBajaPrestamoModal(null)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  {bajaPrestamoModal.tipo === 'prestamo' ? 'Registrar préstamo' :
                    bajaPrestamoModal.tipo === 'venta' ? 'Registrar venta' : 'Dar de baja'}
                </h3>
                <span className="text-soft" style={{ fontSize: '0.8rem' }}>
                  {bajaPrestamoModal.equipo.folio} · {bajaPrestamoModal.equipo.marca} {bajaPrestamoModal.equipo.modelo}{bajaPrestamoModal.equipo.serie ? ` · S/N: ${bajaPrestamoModal.equipo.serie}` : ''}
                </span>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setBajaPrestamoModal(null)}>✕</button>
            </div>
            <form
              className="modal-body"
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              onSubmit={(e) => { e.preventDefault(); handleBajaPrestamoSubmit() }}
            >
              {bajaPrestamoModal.tipo === 'prestamo' && (
                <label className="field">
                  <span>¿A quién se presta? *</span>
                  <input
                    type="text"
                    value={bajaPrestamoForm.prestamo_a}
                    onChange={(e) => setBajaPrestamoForm((f) => ({ ...f, prestamo_a: e.target.value }))}
                    placeholder="Nombre de la persona o área"
                  />
                </label>
              )}
              <label className="field">
                <span>Motivo / observaciones</span>
                <input
                  type="text"
                  value={bajaPrestamoForm.motivo}
                  onChange={(e) => setBajaPrestamoForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder={bajaPrestamoModal.tipo === 'venta' ? 'Comprador y condiciones de la venta' : 'Razón del registro'}
                />
              </label>
              {bajaPrestamoModal.tipo === 'venta' && (
                <label className="field">
                  <span>Precio de venta</span>
                  <input
                    type="number"
                    step="0.01"
                    value={bajaPrestamoForm.precio_venta}
                    onChange={(e) => setBajaPrestamoForm((f) => ({ ...f, precio_venta: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>
              )}
              {bajaPrestamoModal.tipo === 'prestamo' && (
                <label className="field">
                  <span>Fecha límite (opcional)</span>
                  <input
                    type="date"
                    value={bajaPrestamoForm.fecha_fin}
                    onChange={(e) => setBajaPrestamoForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                  />
                </label>
              )}
            </form>
            <div className="modal-footer">
              <button type="button" className="btn-link-danger" onClick={() => setBajaPrestamoModal(null)}>Cancelar</button>
              <button type="button" className="btn-primary small" onClick={handleBajaPrestamoSubmit}>
                {bajaPrestamoModal.tipo === 'prestamo' ? 'Registrar préstamo' :
                  bajaPrestamoModal.tipo === 'venta' ? 'Registrar venta' : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRASPASO DE EQUIPO (FASE 12) */}
      {traspasoModal && (
        <div className="modal-overlay" onClick={() => setTraspasoModal(null)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Traspasar equipo</h3>
                <span className="text-soft" style={{ fontSize: '0.8rem' }}>
                  {traspasoModal.folio} · {traspasoModal.marca} {traspasoModal.modelo}
                  {traspasoModal.ubicacion_nombre ? ` · actual: ${traspasoModal.ubicacion_nombre}` : ''}
                </span>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setTraspasoModal(null)}>✕</button>
            </div>
            <form
              className="modal-body"
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              onSubmit={(e) => { e.preventDefault(); handleTraspasoSubmit() }}
            >
              <label className="field">
                <span>Ubicación de destino *</span>
                <select
                  value={traspasoForm.ubicacion_id}
                  onChange={(e) => setTraspasoForm((f) => ({ ...f, ubicacion_id: e.target.value }))}
                >
                  <option value="">Seleccione la ubicación</option>
                  {ubicaciones
                    .filter((u) => u.id !== traspasoModal.ubicacion_id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}{u.ciudad ? ` (${u.ciudad})` : ''}</option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>Motivo del traspaso</span>
                <input
                  type="text"
                  value={traspasoForm.motivo}
                  onChange={(e) => setTraspasoForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder="Ej. nueva sucursal, cambio de sede"
                />
              </label>
            </form>
            <div className="modal-footer">
              <button type="button" className="btn-link-danger" onClick={() => setTraspasoModal(null)}>Cancelar</button>
              <button type="button" className="btn-primary small" onClick={handleTraspasoSubmit}>Confirmar traspaso</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMPRESA (FASE 8) */}
      {/* Backdrop para Sidebar en móvil */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* BOTTOM SHEET: FILTROS DE STOCK (MÓVIL) */}
      {isFilterOpen && (
        <div className={`bottom-sheet ${isFilterOpen ? 'open' : ''}`}>
          <div className="bottom-sheet-overlay" onClick={() => setIsFilterOpen(false)} />
          <div className="bottom-sheet-content">
            <div className="bottom-sheet-handle" onClick={() => setIsFilterOpen(false)} />
            <div className="panel-header" style={{ padding: 0, marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Filtros de Stock</h3>
              <button type="button" className="btn-modal-close" onClick={() => setIsFilterOpen(false)}>✕</button>
            </div>
            <div className="filter-grid">
              <div className="filter-group">
                <label>Disponibilidad</label>
                <button
                  type="button"
                  className={`filter-pill ${stockFilterOnlyAvailable ? 'active' : ''}`}
                  onClick={() => setStockFilterOnlyAvailable(!stockFilterOnlyAvailable)}
                >
                  <Icon name="box" />
                  <span>Solo Disponibles / En Stock</span>
                  {stockFilterOnlyAvailable && <Icon name="check" />}
                </button>
              </div>
              <div className="filter-group">
                <label>Categoría</label>
                <select
                  className="filter-select"
                  value={stockCategoryFilter}
                  onChange={(e) => setStockCategoryFilter(e.target.value)}
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Ubicación</label>
                <select
                  className="filter-select"
                  value={stockLocationFilter}
                  onChange={(e) => setStockLocationFilter(e.target.value)}
                >
                  <option value="todas">Todas las ubicaciones</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Estado</label>
                <select
                  className="filter-select"
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="disponible">Disponible</option>
                  <option value="asignado">Asignado</option>
                  <option value="reparacion">En reparación</option>
                  <option value="prestamo">Préstamo</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-primary small"
                  style={{ flex: 1 }}
                  onClick={() => setIsFilterOpen(false)}
                >
                  Aplicar Filtros
                </button>
                <button
                  type="button"
                  className="link-button small"
                  style={{ flex: 1, textAlign: 'center', color: 'var(--danger)' }}
                  onClick={() => {
                    setStockFilterOnlyAvailable(false)
                    setStockCategoryFilter('todas')
                    setStockLocationFilter('todas')
                    setStockStatusFilter('todos')
                    setIsFilterOpen(false)
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TICKET DE SOPORTE (nuevo / detalle) */}
      {ticketModalOpen && (
        <div className="modal-overlay" onClick={() => setTicketModalOpen(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{ticketSeleccionado ? `Ticket #${ticketSeleccionado.id}` : 'Nuevo ticket de soporte'}</h3>
                <span className="text-soft" style={{ fontSize: '0.8rem' }}>
                  {ticketSeleccionado ? ticketSeleccionado.titulo : 'Reporte interno del área de sistemas'}
                </span>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setTicketModalOpen(false)}>✕</button>
            </div>

            {ticketSeleccionado ? (
              <div className="modal-body">
                <div className="detail-info-list">
                  <div className="detail-field">
                    <span>Descripción</span>
                    <strong style={{ fontWeight: 500 }}>{ticketSeleccionado.descripcion || 'Sin descripción.'}</strong>
                  </div>
                  <div className="detail-field"><span>Prioridad</span><strong>{ticketSeleccionado.prioridad}</strong></div>
                  <div className="detail-field"><span>Estado</span><strong>{ticketSeleccionado.estado}</strong></div>
                  <div className="detail-field"><span>Técnico</span><strong>{ticketSeleccionado.tecnico || 'Sin asignar'}</strong></div>
                  <div className="detail-field"><span>Equipo</span><strong>{ticketSeleccionado.equipo_folio || '—'}</strong></div>
                  <div className="detail-field"><span>Ubicación</span><strong>{ticketSeleccionado.ubicacion_nombre || '—'}</strong></div>
                  <div className="detail-field"><span>Creado</span><strong>{ticketSeleccionado.created_at ? new Date(ticketSeleccionado.created_at).toLocaleString('es-CO') : '—'}</strong></div>
                  <div className="detail-field">
                    <span>Inicio de visita</span>
                    <strong>{ticketSeleccionado.fecha_visita ? new Date(ticketSeleccionado.fecha_visita).toLocaleString('es-CO') : '—'}</strong>
                  </div>
                  <div className="detail-field">
                    <span>Resolución</span>
                    <strong>{ticketSeleccionado.fecha_resolucion ? new Date(ticketSeleccionado.fecha_resolucion).toLocaleString('es-CO') : '—'}</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>📎 Adjuntos del ticket ({ticketAdjuntos.length})</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {ticketAdjuntos.map((a) => (
                      <div key={a.id} style={{ textAlign: 'center' }}>
                        {a.url && /\.(jpg|jpeg|png|webp)$/i.test(a.url) ? (
                          <img
                            src={`${API_BASE}${a.url}`}
                            alt="adjunto"
                            className="photo-preview-img"
                            style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                          />
                        ) : (
                          <a className="link-button small" href={`${API_BASE}${a.url}`} target="_blank" rel="noreferrer">
                            {a.url.split('/').pop()}
                          </a>
                        )}
                        {canModify && (
                          <button type="button" className="link-button small" style={{ color: 'var(--danger)', display: 'block', margin: '4px auto 0' }} onClick={() => borrarAdjunto(a, () => abrirTicketDetalle(ticketSeleccionado))}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    ))}
                    {!ticketAdjuntos.length && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Sin adjuntos.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTicketCrear} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label className="field">
                  <span>Título *</span>
                  <input type="text" value={ticketForm.titulo} onChange={(e) => setTicketForm({ ...ticketForm, titulo: e.target.value })} placeholder="Ej. PC no enciende en bodega 2" />
                </label>
                <label className="field">
                  <span>Descripción</span>
                  <textarea rows="3" value={ticketForm.descripcion} onChange={(e) => setTicketForm({ ...ticketForm, descripcion: e.target.value })} placeholder="Detalle del problema reportado..." />
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span>Prioridad</span>
                    <select value={ticketForm.prioridad} onChange={(e) => setTicketForm({ ...ticketForm, prioridad: e.target.value })}>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Estado inicial</span>
                    <select value={ticketForm.estado} onChange={(e) => setTicketForm({ ...ticketForm, estado: e.target.value })}>
                      <option value="abierto">Abierto</option>
                      <option value="en_visita">En visita</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Técnico asignado</span>
                    <input type="text" value={ticketForm.tecnico} onChange={(e) => setTicketForm({ ...ticketForm, tecnico: e.target.value })} placeholder="Nombre del técnico" />
                  </label>
                  <label className="field">
                    <span>Equipo relacionado</span>
                    <select value={ticketForm.equipo_id || ''} onChange={(e) => setTicketForm({ ...ticketForm, equipo_id: e.target.value })}>
                      <option value="">Sin equipo</option>
                      {equipos.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo}{eq.serie ? ` · S/N: ${eq.serie}` : ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Ubicación</span>
                    <select value={ticketForm.ubicacion_id || ''} onChange={(e) => setTicketForm({ ...ticketForm, ubicacion_id: e.target.value })}>
                      <option value="">Sin ubicación</option>
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="modal-footer" style={{ borderTop: 'none', padding: '14px 0 0' }}>
                  <button type="button" className="btn-quick-status" onClick={() => setTicketModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary small">Crear ticket</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FAB: Nuevo Movimiento (Solo Móvil) */}
      {canModify && (
        <button
          type="button"
          className="fab-btn"
          onClick={() => {
            setActiveSection('entradas');
            setIsSidebarOpen(false);
          }}
          title="Nuevo movimiento"
        >
          <Icon name="upload" />
        </button>
      )}
    </div>
  )
}

export default App
