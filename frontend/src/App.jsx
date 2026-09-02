import { useEffect, useState } from 'react'

const statLabels = {
  disponibles: 'Disponibles',
  asignados: 'Asignados',
  reparacion: 'En reparación',
  baja: 'Baja',
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'stock', label: 'Stock', icon: 'box' },
  { id: 'historial', label: 'Historial', icon: 'history' },
  { id: 'equipos', label: 'Equipos', icon: 'devices' },
  { id: 'entradas', label: 'Entradas', icon: 'download' },
  { id: 'salidas', label: 'Salidas', icon: 'upload' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
  { id: 'categorias', label: 'Categorías', icon: 'tag' },
  { id: 'ubicaciones', label: 'Ubicaciones', icon: 'pin' },
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

function Icon({ name }) {
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h7v7H4zm9 0h7v4h-7zm0 6h7v10h-7zM4 13h7v7H4z" />
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
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState(initialStats)
  const [equipos, setEquipos] = useState([])
  const [entryCount, setEntryCount] = useState(24)
  const [exitCount, setExitCount] = useState(12)
  const [reportCount, setReportCount] = useState(18)
  const [configSaved, setConfigSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [equipmentForm, setEquipmentForm] = useState({
    folio: '',
    marca: '',
    modelo: '',
    serie: '',
    ubicacion: '',
    estado: 'disponible',
  })
  const [entryForm, setEntryForm] = useState({
    folio: '',
    responsable: '',
    ubicacion: '',
    cantidad: '1',
  })
  const [exitForm, setExitForm] = useState({
    folio: '',
    responsable: '',
    destino: '',
    cantidad: '1',
  })

  const [categorias, setCategorias] = useState([
    { id: 1, nombre: 'Cómputo', descripcion: 'Portátiles, PC de escritorio' },
    { id: 2, nombre: 'Impresión', descripcion: 'Impresoras y escáneres' },
    { id: 3, nombre: 'Redes', descripcion: 'Switches, routers, access points' },
  ])
  const [categoriaForm, setCategoriaForm] = useState({ nombre: '', descripcion: '' })

  const [ubicaciones, setUbicaciones] = useState([
    { id: 1, nombre: 'Bodega Central', ciudad: 'Bogotá', direccion: 'CR. 98 #25g - 10' },
    { id: 2, nombre: 'Sede Norte', ciudad: 'Bogotá', direccion: 'Cra 45 # 103-20' },
  ])
  const [ubicacionForm, setUbicacionForm] = useState({ nombre: '', ciudad: '', direccion: '' })

  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Enrique escorcia', correo: 'eescorcia@eticos.com', rol: 'admin', activo: true },
    { id: 2, nombre: 'Deimer Durango', correo: 'ddurango@eticos.com', rol: 'operativo', activo: true },
  ])
  const [usuarioForm, setUsuarioForm] = useState({ nombre: '', correo: '', rol: 'operativo' })

  const [mantenimientos, setMantenimientos] = useState([
    {
      id: 1,
      equipo_folio: 'EQ-014',
      tipo: 'preventivo',
      descripcion: 'Limpieza y cambio de pasta térmica',
      tecnico: 'Soporte TI',
      estado: 'programado',
    },
  ])
  const [mantenimientoForm, setMantenimientoForm] = useState({
    equipo_folio: '',
    tipo: 'preventivo',
    descripcion: '',
    tecnico: '',
  })

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

  const loadEquipos = () => {
    fetch(`${API_BASE}/api/inventory/equipos`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setEquipos(data) })
      .catch(() => {})
  }

  const loadActas = () => {
    fetch(`${API_BASE}/api/reports/actas`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setActas(data) })
      .catch(() => {})
  }

  const loadStats = () => {
    fetch(`${API_BASE}/api/reports/dashboard`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(initialStats))
  }

  useEffect(() => {
    loadStats()
    loadEquipos()
    loadActas()

    fetch(`${API_BASE}/api/catalogo/categorias`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length) setCategorias(data) })
      .catch(() => {})

    fetch(`${API_BASE}/api/catalogo/ubicaciones`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length) setUbicaciones(data) })
      .catch(() => {})

    fetch(`${API_BASE}/api/usuarios`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length) setUsuarios(data) })
      .catch(() => {})

    fetch(`${API_BASE}/api/mantenimientos`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length) setMantenimientos(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return undefined

    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (message) => setToast(message)

  const handleRegisterEntry = (event) => {
    event.preventDefault()
    if (!entryForm.folio || !entryForm.responsable) {
      showToast('Completa folio y responsable')
      return
    }

    setEntryCount((current) => current + Number(entryForm.cantidad || 1))
    showToast('Entrada registrada correctamente')
    setEntryForm({
      folio: '',
      responsable: '',
      ubicacion: '',
      cantidad: '1',
    })
  }

  const handleNewExit = (event) => {
    event.preventDefault()
    if (!exitForm.folio || !exitForm.responsable) {
      showToast('Completa folio y responsable')
      return
    }

    setExitCount((current) => current + Number(exitForm.cantidad || 1))
    showToast('Salida registrada correctamente')
    setExitForm({
      folio: '',
      responsable: '',
      destino: '',
      cantidad: '1',
    })
  }

  const handleOpenActaById = async (acta) => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/actas/${acta.id}`)
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
    showToast('Configuración guardada')
  }

  const handleQuickStatusChange = async (equipoId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory/equipos/${equipoId}`, {
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
      const res = await fetch(`${API_BASE}/api/reports/actas`, {
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
    if (!equipmentForm.folio || !equipmentForm.marca || !equipmentForm.modelo) {
      showToast('Completa folio, marca y modelo')
      return
    }

    const payload = {
      folio: equipmentForm.folio,
      marca: equipmentForm.marca,
      modelo: equipmentForm.modelo,
      serie: equipmentForm.serie || null,
      ubicacion: equipmentForm.ubicacion || 'Bodega Central',
      estado: equipmentForm.estado,
    }

    try {
      const res = await fetch(`${API_BASE}/api/inventory/equipos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        showToast('Equipo guardado en la base de datos')
        loadEquipos()
      } else {
        const nuevo = { id: Date.now(), ...payload }
        setEquipos((current) => [nuevo, ...current])
        showToast('Equipo agregado al inventario')
      }
    } catch {
      const nuevo = { id: Date.now(), ...payload }
      setEquipos((current) => [nuevo, ...current])
      showToast('Equipo agregado a inventario')
    }

    setEquipmentForm({
      folio: '',
      marca: '',
      modelo: '',
      serie: '',
      ubicacion: '',
      estado: 'disponible',
    })
  }

  const handleAddEquipment = () => {
    const nextId = Date.now()
    const nuevo = {
      id: nextId,
      folio: `EQ-${String(nextId).slice(-5)}`,
      marca: 'Dell',
      modelo: 'OptiPlex 7090',
      ubicacion: 'Oficina Central',
      estado: 'disponible',
    }

    setEquipos((current) => [nuevo, ...current])
    showToast('Equipo agregado a inventario')
  }

  const handleCategoriaSubmit = (event) => {
    event.preventDefault()
    if (!categoriaForm.nombre) {
      showToast('Ingresa el nombre de la categoría')
      return
    }
    setCategorias((current) => [{ id: Date.now(), ...categoriaForm }, ...current])
    setCategoriaForm({ nombre: '', descripcion: '' })
    showToast('Categoría creada')
  }

  const handleUbicacionSubmit = (event) => {
    event.preventDefault()
    if (!ubicacionForm.nombre) {
      showToast('Ingresa el nombre de la ubicación')
      return
    }
    setUbicaciones((current) => [{ id: Date.now(), ...ubicacionForm }, ...current])
    setUbicacionForm({ nombre: '', ciudad: '', direccion: '' })
    showToast('Ubicación creada')
  }

  const handleUsuarioSubmit = (event) => {
    event.preventDefault()
    if (!usuarioForm.nombre || !usuarioForm.correo) {
      showToast('Completa nombre y correo')
      return
    }
    setUsuarios((current) => [{ id: Date.now(), ...usuarioForm, activo: true }, ...current])
    setUsuarioForm({ nombre: '', correo: '', rol: 'operativo' })
    showToast('Usuario creado')
  }

  const handleMantenimientoSubmit = (event) => {
    event.preventDefault()
    if (!mantenimientoForm.equipo_folio) {
      showToast('Indica el folio del equipo')
      return
    }
    setMantenimientos((current) => [
      { id: Date.now(), ...mantenimientoForm, estado: 'programado' },
      ...current,
    ])
    setMantenimientoForm({ equipo_folio: '', tipo: 'preventivo', descripcion: '', tecnico: '' })
    showToast('Mantenimiento programado')
  }

  const handleMantenimientoEstado = (id, estado) => {
    setMantenimientos((current) =>
      current.map((item) => (item.id === id ? { ...item, estado } : item))
    )
    showToast(`Mantenimiento marcado como ${estado.replace('_', ' ')}`)
  }

  const renderSectionContent = () => {
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
                <button type="button" className="btn-primary small" onClick={() => setIsCreateModalOpen(true)}>
                  + Emitir Acta con Stock
                </button>
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

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Equipo / Marca</th>
                    <th>N° Serie</th>
                    <th>Categoría</th>
                    <th>Ubicación</th>
                    <th>Valor Aprox.</th>
                    <th>Estado de Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipos.length ? (
                    filteredEquipos.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="badge-numero">{item.folio}</span>
                        </td>
                        <td>
                          <strong>{item.marca}</strong> {item.modelo}
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                            {item.serie || 'S/N'}
                          </code>
                        </td>
                        <td>
                          <span className="chip" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                            {item.categoria_nombre || 'General'}
                          </span>
                        </td>
                        <td>{item.ubicacion_nombre || item.ubicacion || 'Bodega Central'}</td>
                        <td>
                          {item.valor_aprox
                            ? `$ ${Number(item.valor_aprox).toLocaleString('es-CO')}`
                            : '—'}
                        </td>
                        <td>
                          <span className={`status-pill ${item.estado}`}>
                            {item.estado === 'disponible' ? 'En Stock' : item.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
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
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="empty-row">
                        No se encontraron equipos con los filtros seleccionados
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
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  + Nueva Acta Oficial
                </button>
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
                        <td>
                          <span className="badge-numero">{acta.numero}</span>
                        </td>
                        <td>
                          <span className={acta.tipo === 'SALIDA' ? 'badge-salida' : 'badge-entrada'}>
                            {acta.tipo}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {acta.created_at
                            ? new Date(acta.created_at).toLocaleString('es-CO', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                        <td>
                          <strong>{acta.entregado_por}</strong>
                        </td>
                        <td>
                          <div>{acta.proyecto || 'General'}</div>
                          <small style={{ color: 'var(--text-soft)' }}>
                            {acta.ciudad_destino ? `${acta.ciudad_destino} - ${acta.direccion_destino || ''}` : '—'}
                          </small>
                        </td>
                        <td>{acta.responsable_destino || '—'}</td>
                        <td>
                          <span className="chip" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                            {acta.items_count || acta.items?.length || 1} equipos • {acta.cajas || 1} caja(s)
                          </span>
                        </td>
                        <td>
                          {acta.valor_aprox
                            ? `$ ${Number(acta.valor_aprox).toLocaleString('es-CO')}`
                            : '—'}
                        </td>
                        <td>
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
                <button type="button" className="btn-primary small" onClick={handleAddEquipment}>
                  Agregar equipo
                </button>
                <button type="button" className="link-button" onClick={() => setActiveSection('dashboard')}>
                  Volver al dashboard
                </button>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleEquipmentSubmit}>
              <label>
                <span>Folio</span>
                <input
                  value={equipmentForm.folio}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, folio: event.target.value })}
                  placeholder="EQ-001"
                />
              </label>
              <label>
                <span>Marca</span>
                <input
                  value={equipmentForm.marca}
                  onChange={(event) => setEquipmentForm({ ...equipmentForm, marca: event.target.value })}
                  placeholder="Dell"
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
              <div className="form-actions">
                <button type="submit" className="btn-primary">Guardar equipo</button>
              </div>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.length ? (
                    equipos.map((equipo) => (
                      <tr key={equipo.id}>
                        <td>{equipo.folio}</td>
                        <td>{equipo.marca}</td>
                        <td>{equipo.modelo}</td>
                        <td>{equipo.ubicacion || 'Sin ubicación'}</td>
                        <td>
                          <span className={`status-pill ${equipo.estado}`}>{equipo.estado}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-row">No hay equipos registrados</td>
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
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Entradas</h2>
            </div>

            <form className="form-grid" onSubmit={handleRegisterEntry}>
              <label>
                <span>Folio</span>
                <input
                  value={entryForm.folio}
                  onChange={(event) => setEntryForm({ ...entryForm, folio: event.target.value })}
                  placeholder="EQ-001"
                />
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
                <span>Ubicación</span>
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

            <div className="mini-grid">
              <div className="action-card">
                <strong>{entryCount}</strong>
                <span>Equipos ingresados</span>
              </div>
              <div className="action-card">
                <strong>3</strong>
                <span>Pendientes por revisar</span>
              </div>
            </div>
          </article>
        </section>
      )
    }

    if (activeSection === 'salidas') {
      return (
        <section className="section-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Salidas</h2>
            </div>

            <form className="form-grid" onSubmit={handleNewExit}>
              <label>
                <span>Folio</span>
                <input
                  value={exitForm.folio}
                  onChange={(event) => setExitForm({ ...exitForm, folio: event.target.value })}
                  placeholder="EQ-001"
                />
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
                <span>Destino</span>
                <input
                  value={exitForm.destino}
                  onChange={(event) => setExitForm({ ...exitForm, destino: event.target.value })}
                  placeholder="Área / Usuario"
                />
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

            <div className="mini-grid">
              <div className="action-card">
                <strong>{exitCount}</strong>
                <span>Asignaciones activas</span>
              </div>
              <div className="action-card">
                <strong>2</strong>
                <span>Solicitudes por confirmar</span>
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

            <form className="form-grid" onSubmit={handleMantenimientoSubmit}>
              <label>
                <span>Folio del equipo</span>
                <input
                  value={mantenimientoForm.equipo_folio}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, equipo_folio: event.target.value })}
                  placeholder="EQ-014"
                />
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
                <span>Descripción</span>
                <input
                  value={mantenimientoForm.descripcion}
                  onChange={(event) => setMantenimientoForm({ ...mantenimientoForm, descripcion: event.target.value })}
                  placeholder="Detalle del trabajo"
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Programar mantenimiento</button>
              </div>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Tipo</th>
                    <th>Técnico</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientos.length ? (
                    mantenimientos.map((item) => (
                      <tr key={item.id}>
                        <td>{item.equipo_folio}</td>
                        <td style={{ textTransform: 'capitalize' }}>{item.tipo}</td>
                        <td>{item.tecnico || '—'}</td>
                        <td>{item.descripcion || '—'}</td>
                        <td>
                          <span className={`status-pill ${item.estado}`}>{item.estado.replace('_', ' ')}</span>
                        </td>
                        <td>
                          {item.estado !== 'finalizado' && (
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
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-row">No hay mantenimientos registrados</td>
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

            <div className="chip-list">
              {categorias.map((cat) => (
                <span key={cat.id} className="chip">
                  {cat.nombre}
                  <button type="button" onClick={() => setCategorias((current) => current.filter((c) => c.id !== cat.id))}>
                    ×
                  </button>
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

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {ubicaciones.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.ciudad || '—'}</td>
                      <td>{u.direccion || '—'}</td>
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
              <div className="form-actions">
                <button type="submit" className="btn-primary">Crear usuario</button>
              </div>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.correo}</td>
                      <td>
                        <span className={`status-pill ${u.rol}`}>{u.rol}</span>
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
              <div className="header-actions">
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
                  Exportar PDF
                </button>
              </div>
            </div>

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
                  <div className="acta-logo">INV</div>
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
              <button type="button" className="link-button" onClick={handleSaveConfig}>
                {configSaved ? 'Guardado' : 'Guardar'}
              </button>
            </div>
            <div className="mini-grid">
              <div className="action-card">
                <strong>02</strong>
                <span>Roles activos</span>
              </div>
              <div className="action-card">
                <strong>{configSaved ? 'OK' : '4'}</strong>
                <span>Parámetros del sistema</span>
              </div>
            </div>
          </article>
        </section>
      )
    }

    return (
      <>
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
              <h2>Inventario</h2>
              <button type="button" className="link-button" onClick={() => setActiveSection('equipos')}>
                Ver todo
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.map((equipo) => (
                    <tr key={equipo.id}>
                      <td>{equipo.folio}</td>
                      <td>{equipo.marca}</td>
                      <td>{equipo.modelo}</td>
                      <td>
                        <span className={`status-pill ${equipo.estado}`}>{equipo.estado}</span>
                      </td>
                    </tr>
                  ))}
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
                <span>Activos</span>
                <strong>{stats.totales.disponibles + stats.totales.asignados}</strong>
              </div>
              <div className="summary-item">
                <span>Mes</span>
                <strong>{stats.mes}</strong>
              </div>
              <div className="summary-item">
                <span>Estado</span>
                <strong>Estable</strong>
              </div>
            </div>
          </article>
        </section>
      </>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">INV</div>
          <div>
            <div className="brand-name">INV - Sistemas</div>
            <small>Inventario</small>
          </div>
        </div>

        <nav className="nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Resumen general</p>
            <h1>{navItems.find((item) => item.id === activeSection)?.label || 'Dashboard'}</h1>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button type="button" className="btn-primary" onClick={() => setActiveSection('entradas')}>
              Nuevo movimiento
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
                    <div className="acta-doc-logo">INV</div>
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
    </div>
  )
}

export default App
