import { useEffect, useRef, useState } from 'react'

const statLabels = {
  disponibles: 'Disponibles',
  asignados: 'Asignados',
  reparacion: 'En reparación',
  baja: 'Baja',
  prestamo: 'Préstamo',
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'stock', label: 'Stock', icon: 'box' },
  { id: 'historial', label: 'Historial', icon: 'history' },
  { id: 'equipos', label: 'Equipos', icon: 'devices' },
  { id: 'entradas', label: 'Entradas', icon: 'download' },
  { id: 'salidas', label: 'Salidas', icon: 'upload' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
  { id: 'usuarios', label: 'Usuarios', icon: 'user' },
  { id: 'reportes', label: 'Reportes', icon: 'chart' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings' },
]

const initialStats = {
  totales: {
    disponibles: 0,
    asignados: 0,
    reparacion: 0,
    baja: 0,
  },
  mes: 'Sin datos',
}

const actaItems = [
  {
    item: 'Computadora Dell OptiPlex 7090',
    marca: 'Dell',
    modelo: 'OptiPlex 7090',
    serie: 'SN-12045',
    estado: 'Nuevo',
  },
  {
    item: 'Monitor Samsung 24"',
    marca: 'Samsung',
    modelo: 'S24F350',
    serie: 'SM-9872',
    estado: 'Usado',
  },
  {
    item: 'Teclado Logitech K380',
    marca: 'Logitech',
    modelo: 'K380',
    serie: 'LG-4456',
    estado: 'Nuevo',
  },
]

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
  const [stats, setStats] = useState(initialStats)
  const [equipos, setEquipos] = useState([])
  const [entryCount, setEntryCount] = useState(24)
  const [exitCount, setExitCount] = useState(12)
  const [reportCount, setReportCount] = useState(18)
  const [configSaved, setConfigSaved] = useState(false)
  const [depreciacion, setDepreciacion] = useState(null)
  const [toast, setToast] = useState('')
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
  const [entryForm, setEntryForm] = useState({
    equipo_id: '',
    responsable: '',
    ubicacion: '',
    cantidad: '1',
  })
  const [exitForm, setExitForm] = useState({
    equipo_id: '',
    responsable: '',
    destino: '',
    destino_otro: '',
    cantidad: '1',
  })

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
    tipo: 'preventivo',
    descripcion: '',
    tecnico: '',
    costo: '',
    fecha_programada: '',
    piezas: '',
  })

  // Alertas de mantenimiento por vencer
  const [mtAlertas, setMtAlertas] = useState([])
  // Evidencia (foto) por subir al mantenimiento
  const [mtEvidenciaFile, setMtEvidenciaFile] = useState(null)
  const [mtEvidenciaTarget, setMtEvidenciaTarget] = useState(null)
  // Historial de mantenimiento por equipo (modal)
  const [mtHistorial, setMtHistorial] = useState([])
  const [mtHistorialOpen, setMtHistorialOpen] = useState(false)

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

  // Estados para Actas, Visor Modal y Creación
  const [actas, setActas] = useState([])
  const [selectedActa, setSelectedActa] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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
    items: [
      { dispositivo: '', marca: '', detalle: '', cantidad: 1, serial: '', equipo_id: null },
    ],
  })

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8010'

  const canModify = !!currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'supervisor')
  const canAdmin = !!currentUser && currentUser.rol === 'admin'

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
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: loginForm.correo, password: loginForm.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.detail || 'Credenciales incorrectas')
        return
      }
      setToken(data.access_token)
      setCurrentUser(data.user)
      localStorage.setItem('inv_token', data.access_token)
      localStorage.setItem('inv_user', JSON.stringify(data.user))
      setLoginForm({ correo: '', password: '' })
      showToast(`Bienvenido, ${data.user.nombre}`)
    } catch {
      setLoginError('No se pudo conectar con el servidor')
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

  const loadMantenimientos = () => {
    api('/api/mantenimientos')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMantenimientos(data) })
      .catch(() => {})
    api('/api/reports/mantenimiento/alertas')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMtAlertas(data) })
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

  const handleScannerSubmit = (e) => {
    e.preventDefault()
    if (scannerInput.trim()) {
      handleScannedQr(scannerInput)
    }
    setScannerInput('')
    setIsScannerOpen(false)
  }

  const handleScannedQr = async (raw) => {
    // El QR backend tiene formato: EQUIPO|folio|marca modelo|serie|estado|ubicacion
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

  useEffect(() => {
    if (!toast) return undefined

    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (isScannerOpen && scannerInputRef.current) {
      scannerInputRef.current.focus()
    }
  }, [isScannerOpen])

  const showToast = (message) => setToast(message)

  const handleRegisterEntry = async (event) => {
    event.preventDefault()
    if (!entryForm.responsable) {
      showToast('Completa el responsable')
      return
    }

    const equipo = equipos.find((e) => String(e.id) === String(entryForm.equipo_id))
    if (!equipo) {
      showToast('Selecciona un equipo para la entrada')
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
          items: [
            {
              dispositivo: `${equipo.marca} ${equipo.modelo}`,
              marca: equipo.marca,
              detalle: `Folio: ${equipo.folio}`,
              cantidad: Number(entryForm.cantidad || 1),
              serial: equipo.serie || 'S/N',
              equipo_id: equipo.id,
            },
          ],
        }),
      })
      if (res.ok) {
        const created = await res.json()
        showToast(`Entrada registrada (Acta ${created.numero})`)
        loadActas()
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo registrar la entrada')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }

    setEntryForm({ folio: '', equipo_id: '', responsable: '', ubicacion: '', cantidad: '1' })
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

    const equipo = equipos.find((e) => String(e.id) === String(exitForm.equipo_id))
    if (!equipo) {
      showToast('Selecciona un equipo para la salida')
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
          items: [
            {
              dispositivo: `${equipo.marca} ${equipo.modelo}`,
              marca: equipo.marca,
              detalle: `Folio: ${equipo.folio}`,
              cantidad: Number(exitForm.cantidad || 1),
              serial: equipo.serie || 'S/N',
              equipo_id: equipo.id,
            },
          ],
        }),
      })
      if (res.ok) {
        const created = await res.json()
        showToast(`Salida registrada (Acta ${created.numero})`)
        loadActas()
        loadEquipos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo registrar la salida')
      }
    } catch {
      showToast('Error conectando con el servidor')
    }

    setExitForm({ equipo_id: '', responsable: '', destino: '', destino_otro: '', cantidad: '1' })
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
    window.open(`${API_BASE}/api/reports/actas/${actaId}/pdf`, '_blank', 'noopener,noreferrer')
    showToast('Abriendo PDF oficial del acta')
  }

  const handleOpenActa = () => {
    if (actas && actas.length > 0) {
      handleOpenActaById(actas[0])
    } else {
      window.open(`${API_BASE}/api/reports/acta/latest`, '_blank', 'noopener,noreferrer')
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
        showToast(`Acta ${created.numero} generada con éxito`)
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
          tipo: mantenimientoForm.tipo,
          descripcion: mantenimientoForm.descripcion,
          tecnico: mantenimientoForm.tecnico,
          costo: mantenimientoForm.costo ? parseFloat(mantenimientoForm.costo) : null,
          fecha_programada: mantenimientoForm.fecha_programada || null,
          piezas: mantenimientoForm.piezas || null,
          estado: 'programado',
        }),
      })
      if (res.ok) {
        showToast('Mantenimiento programado')
        setMantenimientoForm({ equipo_id: '', equipo_folio: '', tipo: 'preventivo', descripcion: '', tecnico: '', costo: '', fecha_programada: '', piezas: '' })
        loadMantenimientos()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'No se pudo programar el mantenimiento')
      }
    } catch {
      showToast('Error conectando con el servidor')
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
        showToast('No se pudo actualizar el estado')
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
      const res = await fetch(`${API_BASE}/api/mantenimientos/${mtEvidenciaTarget}/evidencia`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
      const res = await fetch(`${API_BASE}/api/mantenimientos/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
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
    const url = `${API_BASE}/api/reports/exportar/equipos?formato=csv`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Exportando equipos a CSV')
  }

  const handleExportXLSX = () => {
    const url = `${API_BASE}/api/reports/exportar/equipos?formato=xlsx`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Exportando equipos a Excel')
  }

  const handleExportActasCSV = () => {
    const url = `${API_BASE}/api/reports/exportar/actas?formato=csv`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Exportando actas a CSV')
  }

  const handleExportActasXLSX = () => {
    const url = `${API_BASE}/api/reports/exportar/actas?formato=xlsx`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Exportando actas a Excel')
  }

  const handleExportMantenimientosCSV = () => {
    const url = `${API_BASE}/api/reports/exportar/mantenimientos?formato=csv`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Exportando mantenimientos a CSV')
  }

  const handleExportMantenimientosXLSX = () => {
    const url = `${API_BASE}/api/reports/exportar/mantenimientos?formato=xlsx`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Exportando mantenimientos a Excel')
  }

  const handleExportPDFInventarioUbicacion = () => {
    const url = `${API_BASE}/api/reports/pdf/inventario-por-ubicacion`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Generando PDF: inventario por ubicación')
  }

  const handleExportPDFResumenMantenimientos = () => {
    const url = `${API_BASE}/api/reports/pdf/resumen-mantenimientos`
    window.open(url, '_blank', 'noopener,noreferrer')
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
                <span>Número de serie</span>
                <input
                  value={equipmentForm.serie}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, serie: event.target.value })}
                  placeholder="SN-123456"
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
                      <td colSpan="6" className="empty-row">No hay equipos registrados</td>
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
                <span>Equipo</span>
                <select
                  value={entryForm.equipo_id || ''}
                  onChange={(event) => setEntryForm({ ...entryForm, equipo_id: event.target.value })}
                >
                  <option value="">Selecciona un equipo</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo} ({eq.estado})</option>
                  ))}
                </select>
              </label>
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
                <span>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  value={entryForm.cantidad}
                  onChange={(event) => setEntryForm({ ...entryForm, cantidad: event.target.value })}
                />
              </label>
              <div className="form-actions">
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
                <span>Equipo</span>
                <select
                  value={exitForm.equipo_id || ''}
                  onChange={(event) => setExitForm({ ...exitForm, equipo_id: event.target.value })}
                >
                  <option value="">Selecciona un equipo</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.folio} — {eq.marca} {eq.modelo} ({eq.estado})</option>
                  ))}
                </select>
              </label>
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
                <span>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  value={exitForm.cantidad}
                  onChange={(event) => setExitForm({ ...exitForm, cantidad: event.target.value })}
                />
              </label>
              <div className="form-actions">
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
                    <li key={a.id}>
                      {a.equipo_marca} {a.equipo_modelo} ({a.equipo_folio}) — {a.tipo} —{' '}
                      {a.fecha_programada ? new Date(a.fecha_programada).toLocaleDateString('es-CO') : 's/fecha'} ·{' '}
                      <strong style={{ textTransform: 'capitalize' }}>{a.nivel}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                <span>Costo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mantenimientoForm.costo}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, costo: event.target.value })}
                  placeholder="Ej: 150000"
                />
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
                    <th>Técnico</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Costo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientos.length ? (
                    mantenimientos.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Equipo">{item.equipo_folio}</td>
                        <td data-label="Tipo" style={{ textTransform: 'capitalize' }}>{item.tipo}</td>
                        <td data-label="Técnico">{item.tecnico || '—'}</td>
                        <td data-label="Descripción">{item.descripcion || '—'}</td>
                        <td data-label="Estado">
                          <span className={`status-pill ${item.estado}`}>{item.estado.replace('_', ' ')}</span>
                        </td>
                        <td data-label="Costo">{item.costo != null ? `$ ${Number(item.costo).toLocaleString('es-CO')}` : '—'}</td>
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
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="empty-row">No hay mantenimientos registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                <strong>96%</strong>
                <span>Disponibilidad general</span>
              </div>
              <div className="action-card">
                <strong>{actas.length}</strong>
                <span>Actas emitidas</span>
              </div>
            </div>

            <div className="acta-card">
              <div className="acta-header">
                <div className="acta-brand">
                  <div className="acta-logo">
                    <img src="/logo_eticos.svg" alt="Logo" className="brand-logo-img" />
                  </div>
                  <div>
                    <strong>INV - Sistemas</strong>
                    <small>Inventario y control de activos</small>
                  </div>
                </div>
                <div className="acta-meta">
                  <span>ACTA No. {actas[0]?.numero || '001'}</span>
                  <span>
                    Fecha:{' '}
                    {actas[0]?.created_at
                      ? new Date(actas[0].created_at).toLocaleDateString('es-CO')
                      : '01/09/2026'}
                  </span>
                </div>
              </div>

              <div className="acta-title-wrap">
                <h3>Acta de entrega / recepción de equipos</h3>
              </div>

              <div className="acta-info-grid">
                <div>
                  <span>Responsable</span>
                  <strong>{actas[0]?.entregado_por || 'Ing. Enrique Escorcia'}</strong>
                </div>
                <div>
                  <span>Área / ubicación</span>
                  <strong>{actas[0]?.ciudad_destino || 'Oficina Central'}</strong>
                </div>
                <div>
                  <span>Tipo de movimiento</span>
                  <strong>{actas[0]?.tipo || 'SALIDA'}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong>En operación</strong>
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
                      actaItems.map((item) => (
                        <tr key={item.serie}>
                          <td>{item.item}</td>
                          <td>{item.marca}</td>
                          <td>{item.modelo}</td>
                          <td>{item.serie}</td>
                          <td>{item.estado}</td>
                        </tr>
                      ))
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
          </article>
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
              <img src="/logo_eticos.svg" alt="Sistemas Bogotá" className="brand-logo-img" />
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
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Entrar
              </button>
            </div>
          </form>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
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

        {renderSectionContent()}

        {toast && <div className="toast">{toast}</div>}
      </main>

      {/* MODAL: VISOR DE ACTA OFICIAL */}
      {isViewModalOpen && selectedActa && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Icon name="fileText" />
                Acta Oficial: {selectedActa.numero} ({selectedActa.tipo})
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
                      <img src="/logo_eticos.svg" alt="Logo" className="brand-logo-img" />
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
              </div>
            </div>

            <div className="modal-footer">
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
                  {bajaPrestamoModal.equipo.folio} · {bajaPrestamoModal.equipo.marca} {bajaPrestamoModal.equipo.modelo}
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
