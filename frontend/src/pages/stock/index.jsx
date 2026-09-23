import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import { Badge, Card, ConfirmModal, EmptyState, LoadingBlock, Modal, PageHeader, StatCard } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDateTime, fmtMoney } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

const VACIO = { nombre: "", tipo: "EQUIPO", codigo: "", marca_id: "", modelo_id: "", categoria_id: "", stock_minimo: 0, valor_unitario: "" };

const TIPOS_MOV = [
  ["ENTRADA", "Entradas"],
  ["SALIDA", "Salidas"],
  ["AJUSTE", "Ajustes"],
];

export default function Stock() {
  const { can } = useAuth();
  const { pushToast } = useToast();

  const [tab, setTab] = useState("items");
  const [qItems, setQItems] = useState("");
  const [pageItems, setPageItems] = useState(1);
  const [pageActivos, setPageActivos] = useState(1);
  const [qActivos, setQActivos] = useState("");
  const [filtroActivos, setFiltroActivos] = useState("");
  const [filtroMov, setFiltroMov] = useState("");
  const [pageMov, setPageMov] = useState(1);

  // modales
  const [movModal, setMovModal] = useState(null); // { tipo, itemId, refTipo }
  const [itemModal, setItemModal] = useState(null); // null | { item?: StockItem }
  const [historial, setHistorial] = useState(null); // null | { titulo, refId, refTipo }
  const [histKey, setHistKey] = useState(0);
  const [anulando, setAnulando] = useState(null);
  const [busy, setBusy] = useState(false);

  // datos auxiliares (catálogos)
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [itemsTodos, setItemsTodos] = useState([]);
  const [activosTodos, setActivosTodos] = useState([]);
  const [itemsBusy, setItemsBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/catalogo/categorias/todas").catch(() => ({ data: { items: [] } })),
      api.get("/catalogo/marcas?size=500").catch(() => ({ data: { items: [] } })),
      api.get("/catalogo/modelos").catch(() => ({ data: [] })),
      api.get("/catalogo/proveedores?size=500").catch(() => ({ data: { items: [] } })),
      api.get("/geo/ubicaciones").catch(() => ({ data: [] })),
    ]).then(([c, m, mo, p, u]) => {
      setCategorias(c.data?.items || c.data || []);
      setMarcas(m.data?.items || []);
      setModelos(mo.data || []);
      setProveedores(p.data?.items || []);
      setUbicaciones(u.data || []);
    });
  }, []);

  const cargarReferencias = async () => {
    setItemsBusy(true);
    try {
      const [i, a] = await Promise.all([
        api.get("/stock/items/todos").catch(() => ({ data: [] })),
        api.get("/activos?page=1&size=200&incluir_inactivos=true").catch(() => ({ data: { items: [] } })),
      ]);
      setItemsTodos(i.data || []);
      setActivosTodos(a.data?.items || []);
    } catch { /* el modal guarda con selects vacíos */ }
    finally { setItemsBusy(false); }
  };

  const resumenQ = useMemo(() => api.get("/stock/resumen"), []);
  const resumen = useAsync(() => resumenQ, []);

  const itemsQ = useMemo(
    () => api.get(`/stock/items?page=${pageItems}&size=20${qItems ? `&q=${encodeURIComponent(qItems)}` : ""}`),
    [pageItems, qItems]
  );
  const itemsState = useAsync(() => itemsQ, [pageItems, qItems]);

  const activosQ = useMemo(
    () => api.get(`/activos?page=${pageActivos}&size=20&incluir_inactivos=true${qActivos ? `&q=${encodeURIComponent(qActivos)}` : ""}${filtroActivos ? `&tipo=${filtroActivos}` : ""}`),
    [pageActivos, qActivos, filtroActivos]
  );
  const activosState = useAsync(() => activosQ, [pageActivos, qActivos, filtroActivos]);

  const movQ = useMemo(
    () => api.get(`/stock/movimientos?page=${pageMov}&size=20${filtroMov ? `&tipo=${filtroMov}` : ""}`),
    [pageMov, filtroMov]
  );
  const movState = useAsync(() => movQ, [pageMov, filtroMov]);

  const recargarTodo = () => {
    resumen.reload();
    itemsState.reload();
    activosState.reload();
    movState.reload();
  };

  useEffect(() => {
    if (movModal) cargarReferencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movModal]);

  const abrirMovimiento = (tipo, referencia = null) => {
    setMovModal({ tipo, itemId: referencia?.item_id || (referencia?.id && referencia.nombre ? referencia.id : null), refTipo: referencia?.refTipo || "ITEM" });
  };

  const confirmarMovimiento = async (payload) => {
    setBusy(true);
    try {
      const { data } = await api.post("/stock/movimientos", payload);
      if (payload.tipo === "AJUSTE") {
        pushToast("success", `Ajuste ${data.numero} registrado (stock ${data.stock_anterior ?? "?"} → ${data.nuevo_stock}).`);
      } else {
        pushToast("success", `${payload.tipo === "ENTRADA" ? "Entrada" : "Salida"} ${data.numero} registrada. Acta ${data.acta_id ? "generada." : "no generada."}`);
      }
      setMovModal(null);
      recargarTodo();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmarItem = async (payload, id) => {
    setBusy(true);
    try {
      if (id) await api.put(`/stock/items/${id}`, payload);
      else await api.post("/stock/items", payload);
      pushToast("success", id ? "Ítem actualizado" : "Ítem creado");
      setItemModal(null);
      itemsState.reload();
      resumen.reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmarAnulacion = async () => {
    if (!anulando?.motivo?.trim()) return pushToast("warning", "Indica el motivo de la anulación");
    setBusy(true);
    try {
      await api.put(`/stock/movimientos/${anulando.id}/anular`, { motivo: anulando.motivo });
      pushToast("success", `Movimiento ${anulando.numero} anulado. Existencia revertida.`);
      setAnulando(null);
      recargarTodo();
      setHistKey((k) => k + 1);
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const sincronizar = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/stock/items/sincronizar");
      pushToast("success", data.creados > 0 ? `Se crearon ${data.creados} ítems desde los activos.` : "Los ítems ya estaban sincronizados.");
      recargarTodo();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const rData = resumen.data;
  const items = itemsState.data?.items || [];
  const activos = activosState.data?.items || [];
  const movs = movState.data?.items || [];

  const kpis = [
    { icon: "boxes", label: "Ítems en catálogo", value: rData?.items_activos, color: "#0b66c2" },
    { icon: "box-seam", label: "Unidades en stock", value: rData?.unidades_totales, color: "#17b26a" },
    { icon: "pc-display", label: "Activos en bodega", value: rData?.activos_en_bodega, color: "#f79009" },
    { icon: "cash-coin", label: "Valor del stock", value: fmtMoney(rData?.valor_stock), color: "#2f8fe0" },
  ];

  return (
    <div>
      <PageHeader
        title="Stock · Entradas, salidas y ajustes"
        subtitle="Existencias por ítem y por activo, con detalle por ubicación y conteo físico"
        icon="boxes"
        actions={
          <>
            <button className="btn btn-sm btn-light" title="Sincronizar ítems desde los activos" disabled={!can("editar_activos")} onClick={sincronizar}>
              <i className="bi bi-arrow-repeat me-1" /> Sincronizar
            </button>
            {can("crear_movimientos") && (
              <>
                <button className="btn btn-sm btn-success" onClick={() => abrirMovimiento("ENTRADA")}>
                  <i className="bi bi-plus-circle me-1" /> Entrada
                </button>
                <button className="btn btn-sm btn-brand" onClick={() => abrirMovimiento("SALIDA")}>
                  <i className="bi bi-box-arrow-up me-1" /> Salida
                </button>
                <button className="btn btn-sm btn-warning" title="Registrar un ajuste por conteo físico" onClick={() => abrirMovimiento("AJUSTE")}>
                  <i className="bi bi-sliders me-1" /> Ajuste
                </button>
              </>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={recargarTodo}>
              <i className="bi bi-arrow-clockwise me-1" /> Refrescar
            </button>
          </>
        }
      />

      <div className="row g-3 mb-3">
        {kpis.map((k) => (
          <div className="col-6 col-lg-3" key={k.label}>
            <StatCard {...k} sub={k.label === "Ítems en catálogo" ? "agregados" : undefined} />
          </div>
        ))}
      </div>

      {(rData?.stock_bajo || []).length > 0 && (
        <div className="eticos-card mb-3 p-3">
          <div className="fw-semibold mb-2 text-warning">
            <i className="bi bi-exclamation-triangle me-1" /> Stock bajo o agotado
          </div>
          <div className="d-flex flex-wrap gap-2">
            {rData.stock_bajo.map((i) => (
              <button key={i.id} className="badge eta-badge border-0" style={{ background: "#f790091c", color: "#f79009", border: "1px solid #f7900940" }} onClick={() => setHistorial({ titulo: i.nombre, refId: i.id, refTipo: "ITEM" })}>
                {i.nombre} · {i.cantidad_stock} {i.stock_minimo > 0 ? `/ mínimo ${i.stock_minimo}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {(rData?.por_sede || []).length > 0 && (
        <div className="eticos-card mb-3 p-3">
          <div className="fw-semibold mb-2">
            <i className="bi bi-geo-alt me-1" /> Stock por ubicación
          </div>
          <div className="d-flex flex-wrap gap-2">
            {rData.por_sede.map((u) => (
              <span key={u.ubicacion_id} className="badge eta-badge" style={{ background: "#e9f2fc", color: "#0b66c2", border: "1px solid #0b66c240" }}>
                {u.nombre}: <b>{u.unidades}</b>
              </span>
            ))}
            <span className="badge eta-badge" style={{ background: "#f2f4f7", color: "#475467", border: "1px solid #e4e7ec" }}>
              Total: <b>{rData?.unidades_totales}</b>
            </span>
          </div>
        </div>
      )}

      <ul className="nav nav-pills mb-3 gap-2">
        {[
          ["items", "Ítems agregados"],
          ["activos", "Activos seriados"],
          ["movimientos", "Entradas / Salidas / Ajustes"],
        ].map(([k, l]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? "active eta-pill-active" : "eta-pill"}`} onClick={() => setTab(k)}>
              <i className={`bi bi-${k === "items" ? "boxes" : k === "activos" ? "pc-display" : "arrow-repeat"}`}></i> {l}
            </button>
          </li>
        ))}
      </ul>

      {tab === "items" && (
        <Card title={`Ítems de inventario (${itemsState.data?.total ?? 0})`} icon="boxes"
          actions={
            <>
              <input className="form-control form-control-sm me-2" style={{ width: 200 }} placeholder="Buscar ítem…" value={qItems} onChange={(e) => { setPageItems(1); setQItems(e.target.value); }} />
              <button className="btn btn-sm btn-brand" onClick={() => setItemModal({})}>
                <i className="bi bi-plus-lg me-1" /> Nuevo ítem
              </button>
            </>
          }
        >
          {itemsState.loading ? <LoadingBlock /> : items.length === 0 ? (
            <EmptyState icon="boxes" title="Sin ítems" hint="Crea ítems o usa 'Sincronizar' para generarlos desde los activos" />
          ) : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr>
                  <th>Ítem</th><th>Tipo</th><th>Marca/Modelo</th><th className="text-center">Stock</th>
                  <th className="text-center">Mínimo</th><th className="text-end">Valor unit.</th><th className="text-end">Valor total</th><th></th>
                </tr></thead>
                <tbody>
                  {items.map((i) => {
                    const bajo = i.cantidad_stock <= i.stock_minimo;
                    return (
                      <tr key={i.id}>
                        <td>
                          <div className="fw-semibold">{i.nombre}</div>
                          {i.codigo && <small className="text-secondary">{i.codigo}</small>}
                        </td>
                        <td className="small">{i.tipo}</td>
                        <td className="small">
                          {i.marca?.nombre || "—"} {i.modelo?.nombre ? `/ ${i.modelo.nombre}` : ""}
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {(i.ubicaciones || []).map((u) => (
                              <span key={u.ubicacion_id} title={u.ubicacion?.nombre || `Ubicación #${u.ubicacion_id}`} className="badge eta-badge" style={{ background: "#f2f4f7", color: "#475467", border: "1px solid #e4e7ec", fontSize: "10px" }}>
                                {u.ubicacion?.nombre || u.ubicacion_id}: {u.cantidad}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge eta-badge ${bajo ? "text-danger-subtle-danger" : ""}`} style={bajo ? { background: "#eb3f5b1c", color: "#eb3f5b" } : { background: "#e9f2fc", color: "#0b66c2", border: "1px solid #0b66c240" }}>
                            {i.cantidad_stock}
                          </span>
                        </td>
                        <td className="text-center">{i.stock_minimo}</td>
                        <td className="text-end small">{fmtMoney(i.valor_unitario)}</td>
                        <td className="text-end small fw-semibold">{fmtMoney(i.valor_total)}</td>
                        <td className="text-end text-nowrap">
                          <button className="btn btn-sm btn-light" title="Entrada" disabled={!can("crear_movimientos")} onClick={() => abrirMovimiento("ENTRADA", { item_id: i.id, refTipo: "ITEM" })}>
                            <i className="bi bi-plus-circle text-success"></i>
                          </button>
                          <button className="btn btn-sm btn-light" title="Salida" disabled={!can("crear_movimientos")} onClick={() => abrirMovimiento("SALIDA", { item_id: i.id, refTipo: "ITEM" })}>
                            <i className="bi bi-box-arrow-up text-primary"></i>
                          </button>
                          <button className="btn btn-sm btn-light" title="Ajuste (conteo físico)" disabled={!can("crear_movimientos")} onClick={() => abrirMovimiento("AJUSTE", { item_id: i.id, refTipo: "ITEM" })}>
                            <i className="bi bi-sliders text-warning"></i>
                          </button>
                          <button className="btn btn-sm btn-light" title="Historial" onClick={() => setHistorial({ titulo: i.nombre, refId: i.id, refTipo: "ITEM" })}>
                            <i className="bi bi-clock-history text-secondary"></i>
                          </button>
                          <button className="btn btn-sm btn-light" title="Editar" disabled={!can("editar_activos")} onClick={() => setItemModal({ item: i })}>
                            <i className="bi bi-pencil"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {itemsState.data?.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-2 border-top">
              <small className="text-secondary">Página {pageItems} de {itemsState.data.pages}</small>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-light" disabled={pageItems <= 1} onClick={() => setPageItems((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
                <button className="btn btn-light" disabled={pageItems >= itemsState.data.pages} onClick={() => setPageItems((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "activos" && (
        <Card title={`Activos seriados (${activosState.data?.total ?? 0})`} icon="pc-display"
          actions={
            <>
              <select className="form-select form-select-sm me-2 w-auto" value={filtroActivos} onChange={(e) => { setPageActivos(1); setFiltroActivos(e.target.value); }}>
                <option value="">Todos los tipos</option>
                <option value="EQUIPO">EQUIPO</option>
                <option value="ACCESORIO">ACCESORIO</option>
                <option value="PLANTA">PLANTA</option>
              </select>
              <input className="form-control form-control-sm" style={{ width: 180 }} placeholder="Buscar activo…" value={qActivos} onChange={(e) => { setPageActivos(1); setQActivos(e.target.value); }} />
            </>
          }
        >
          {activosState.loading ? <LoadingBlock /> : activos.length === 0 ? (
            <EmptyState icon="pc-display" title="Sin activos" hint="Los activos registrados aparecen con su stock individual" />
          ) : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr>
                  <th>Código</th><th>Equipo</th><th>Serial/Inventario</th><th>Marca/Modelo</th>
                  <th className="text-center">Stock</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {activos.map((a) => (
                    <tr key={a.id}>
                      <td><Link to={`/activos/${a.id}`} className="fw-semibold">{a.codigo}</Link></td>
                      <td className="small">{a.tipo}</td>
                      <td className="small">{a.serial || a.codigo_inventario || "—"}</td>
                      <td className="small">{a.marca?.nombre || "—"} {a.modelo?.nombre ? `/ ${a.modelo.nombre}` : ""}</td>
                      <td className="text-center">
                        <span className={`badge eta-badge ${a.cantidad_stock > 0 ? "" : ""}`} style={a.cantidad_stock > 0 ? { background: "#e9f2fc", color: "#0b66c2", border: "1px solid #0b66c240" } : { background: "#eb3f5b1c", color: "#eb3f5b" }}>
                          {a.cantidad_stock ?? 0}
                        </span>
                      </td>
                      <td><Badge estado={estadoInfo(a.estado?.nombre)} /></td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-light" title="Entrada" disabled={!can("crear_movimientos")} onClick={() => abrirMovimiento("ENTRADA", { item_id: a.id, refTipo: "ACTIVO" })}>
                          <i className="bi bi-plus-circle text-success"></i>
                        </button>
                        <button className="btn btn-sm btn-light" title="Salida" disabled={!can("crear_movimientos")} onClick={() => abrirMovimiento("SALIDA", { item_id: a.id, refTipo: "ACTIVO" })}>
                          <i className="bi bi-box-arrow-up text-primary"></i>
                        </button>
                        <button className="btn btn-sm btn-light" title="Ajuste (conteo físico)" disabled={!can("crear_movimientos")} onClick={() => abrirMovimiento("AJUSTE", { item_id: a.id, refTipo: "ACTIVO" })}>
                          <i className="bi bi-sliders text-warning"></i>
                        </button>
                        <button className="btn btn-sm btn-light" title="Historial" onClick={() => setHistorial({ titulo: a.codigo, refId: a.id, refTipo: "ACTIVO" })}>
                          <i className="bi bi-clock-history text-secondary"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activosState.data?.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-2 border-top">
              <small className="text-secondary">Página {pageActivos} de {activosState.data.pages}</small>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-light" disabled={pageActivos <= 1} onClick={() => setPageActivos((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
                <button className="btn btn-light" disabled={pageActivos >= activosState.data.pages} onClick={() => setPageActivos((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "movimientos" && (
        <Card title={`Movimientos de stock (${movState.data?.total ?? 0})`} icon="arrow-repeat"
          actions={
            <select className="form-select form-select-sm me-2 w-auto" value={filtroMov} onChange={(e) => { setPageMov(1); setFiltroMov(e.target.value); }}>
              <option value="">Todos</option>
              {TIPOS_MOV.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          }
        >
          {movState.loading ? <LoadingBlock /> : movs.length === 0 ? (
            <EmptyState icon="arrow-repeat" title="Sin movimientos de stock" hint="Las entradas, salidas y ajustes aparecen aquí y se reflejan en el stock" />
          ) : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr>
                  <th>Número</th><th>Fecha</th><th>Tipo</th><th>Referencia</th>
                  <th className="text-center">Cantidad</th><th>Ubicación</th>
                  <th>Documento</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {movs.map((m) => (
                    <tr key={m.id}>
                      <td><span className="fw-semibold">{m.numero}</span></td>
                      <td className="text-secondary small">{fmtDateTime(m.fecha)}</td>
                      <td><Badge estado={estadoInfo(m.tipo)} /></td>
                      <td className="small">
                        {m.item ? m.item.nombre : m.activo ? <Link to={`/activos/${m.activo.id}`}>{m.activo.codigo}</Link> : "—"}
                        {m.referencia_tipo === "ITEM" && m.item_id && (
                          <button className="btn btn-link btn-sm p-0 ms-1" title="Ver historial" onClick={() => setHistorial({ titulo: m.item?.nombre || `Ítem #${m.item_id}`, refId: m.item_id, refTipo: "ITEM" })}>
                            <i className="bi bi-clock-history text-secondary"></i>
                          </button>
                        )}
                      </td>
                      <td className="text-center fw-semibold">
                        {m.tipo === "AJUSTE" ? (
                          <span title="Antes → nuevo"><span className="text-secondary">{m.stock_anterior ?? m.cantidad}</span> <i className="bi bi-arrow-right small"></i> <span className="text-brand">{m.nuevo_stock ?? m.cantidad}</span></span>
                        ) : (
                          m.cantidad
                        )}
                      </td>
                      <td className="small">{m.ubicacion?.nombre || "—"}</td>
                      <td className="small">{m.documento || "—"}</td>
                      <td><Badge estado={estadoInfo(m.estado)} /></td>
                      <td className="text-end text-nowrap">
                        {m.acta_id && (
                          <button className="btn btn-sm btn-light" title="Descargar acta" onClick={() => downloadFile(`/activos/actas/${m.acta_id}/pdf`, `${m.numero}.pdf`)}>
                            <i className="bi bi-file-earmark-pdf text-danger"></i>
                          </button>
                        )}
                        {can("aprobar_movimientos") && m.estado !== "ANULADO" && (
                          <button className="btn btn-sm btn-light" title="Anular" onClick={() => setAnulando({ id: m.id, numero: m.numero, motivo: "" })}>
                            <i className="bi bi-x-octagon text-danger"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {movState.data?.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-2 border-top">
              <small className="text-secondary">Página {pageMov} de {movState.data.pages}</small>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-light" disabled={pageMov <= 1} onClick={() => setPageMov((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
                <button className="btn btn-light" disabled={pageMov >= movState.data.pages} onClick={() => setPageMov((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
              </div>
            </div>
          )}
        </Card>
      )}

      <MovimientoModal open={!!movModal} modal={movModal} items={itemsTodos} activos={activosTodos} ubicaciones={ubicaciones} proveedores={proveedores} busy={busy} itemsBusy={itemsBusy} pushToast={pushToast} onClose={() => setMovModal(null)} onConfirm={confirmarMovimiento} />

      <ItemModal open={!!itemModal} modal={itemModal} categorias={categorias} marcas={marcas} modelos={modelos} busy={busy} onClose={() => setItemModal(null)} onConfirm={confirmarItem} />

      <HistorialModal open={!!historial} item={historial} key={histKey} canAnular={can("aprobar_movimientos")} onAnular={setAnulando} onClose={() => setHistorial(null)} />

      <ConfirmModal
        open={!!anulando}
        title={`Anular ${anulando?.numero || ""}`}
        message="La anulación revierte la existencia que esta operación movió. Queda registrado en auditoría."
        confirmLabel="Anular movimiento"
        danger
        busy={busy}
        onClose={() => setAnulando(null)}
        onConfirm={confirmarAnulacion}
      >
        <input className="form-control" placeholder="Motivo *" value={anulando?.motivo || ""} onChange={(e) => setAnulando((a) => ({ ...a, motivo: e.target.value }))} />
      </ConfirmModal>
    </div>
  );
}

/* ------------------------------------------------------------- modal movimiento */
function MovimientoModal({ open, modal, items, activos, ubicaciones, proveedores, busy, itemsBusy, pushToast, onClose, onConfirm }) {
  const [f, setF] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const tipo = modal?.tipo || "ENTRADA";
  const esEntrada = tipo === "ENTRADA";
  const esAjuste = tipo === "AJUSTE";

  useEffect(() => {
    if (open) {
      setBusqueda("");
      setF({
        tipo,
        referencia_tipo: modal.refTipo || "ITEM",
        item_id: modal.itemId ?? "",
        activo_id: modal.itemId ?? "",
        cantidad: 1,
        nuevo_stock: "",
        ubicacion_id: "",
        proveedor_id: "",
        documento: "",
        destino: "",
        valor: "",
        motivo: "",
        observaciones: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modal]);

  const origen = f.referencia_tipo === "ACTIVO" ? activos : items;
  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? origen.filter((o) => [o.nombre, o.codigo, o.serial, o.codigo_inventario, o.marca?.nombre, o.modelo?.nombre].filter(Boolean).some((t) => t.toLowerCase().indexOf(q) !== -1))
    : origen;
  const seleccionado =
    (f.referencia_tipo === "ACTIVO"
      ? activos.find((a) => String(a.id) === String(f.activo_id))
      : items.find((i) => String(i.id) === String(f.item_id))) || null;
  const stockActual = seleccionado ? (seleccionado.cantidad_stock ?? 0) : null;
  const stockUbicacion = seleccionado && f.ubicacion_id ? (seleccionado.ubicaciones || []).find((u) => String(u.ubicacion_id) === String(f.ubicacion_id))?.cantidad ?? null : null;

  const guardar = () => {
    if (!seleccionado) return pushToast("warning", "Selecciona la referencia");
    if (esAjuste) {
      const ns = Number(f.nuevo_stock);
      if (!Number.isFinite(ns) || ns < 0) return pushToast("warning", "Indica la nueva existencia del conteo");
      if (!f.motivo.trim()) return pushToast("warning", "El motivo del ajuste es obligatorio");
      if (f.referencia_tipo === "ITEM" && !f.ubicacion_id && stockActual !== null && (seleccionado.ubicaciones || []).length > 0)
        return pushToast("warning", "El ítem tiene stock por ubicación: selecciona dónde se hizo el conteo");
      onConfirm({
        tipo,
        referencia_tipo: f.referencia_tipo,
        item_id: f.referencia_tipo === "ITEM" ? Number(f.item_id) : undefined,
        activo_id: f.referencia_tipo === "ACTIVO" ? Number(f.activo_id) : undefined,
        nuevo_stock: ns,
        ubicacion_id: f.ubicacion_id ? Number(f.ubicacion_id) : undefined,
        motivo: f.motivo.trim(),
        observaciones: f.observaciones || undefined,
      });
      return;
    }
    if (!f.cantidad || f.cantidad < 1) return pushToast("warning", "Indica una cantidad válida");
    if (!esEntrada && stockActual !== null && f.cantidad > stockActual) return pushToast("warning", `Solo hay ${stockActual} unidad(es) disponibles`);
    if (!esEntrada && stockUbicacion !== null && f.cantidad > stockUbicacion) return pushToast("warning", `En esa ubicación solo hay ${stockUbicacion} unidad(es)`);
    onConfirm(
      esEntrada
        ? { ...f, referencia_tipo: f.referencia_tipo, item_id: f.referencia_tipo === "ITEM" ? Number(f.item_id) : undefined, activo_id: f.referencia_tipo === "ACTIVO" ? Number(f.activo_id) : undefined, proveedor_id: f.proveedor_id ? Number(f.proveedor_id) : undefined, valor: f.valor === "" ? undefined : Number(f.valor), ubicacion_id: f.ubicacion_id ? Number(f.ubicacion_id) : undefined }
        : { ...f, item_id: f.referencia_tipo === "ITEM" ? Number(f.item_id) : undefined, activo_id: f.referencia_tipo === "ACTIVO" ? Number(f.activo_id) : undefined, valor: f.valor === "" ? undefined : Number(f.valor), ubicacion_id: f.ubicacion_id ? Number(f.ubicacion_id) : undefined }
    );
  };

  const titulo = esAjuste ? "Registrar ajuste (conteo físico)" : esEntrada ? "Nueva entrada a bodega" : "Nueva salida de bodega";
  const icono = esAjuste ? "sliders" : esEntrada ? "plus-circle" : "box-arrow-up";

  return (
    <Modal open={open} title={titulo} icon={icono} size="lg" busy={busy} onClose={onClose}>
      {!open ? null : (
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label small fw-semibold">Tipo de referencia</label>
            <div className="d-flex gap-3">
              <label className="form-check">
                <input className="form-check-input" type="radio" checked={f.referencia_tipo === "ITEM"} onChange={() => setF((s) => ({ ...s, referencia_tipo: "ITEM", item_id: "", activo_id: "" }))} />
                <span className="form-check-label small">Ítem agregado</span>
              </label>
              <label className="form-check">
                <input className="form-check-input" type="radio" checked={f.referencia_tipo === "ACTIVO"} onChange={() => setF((s) => ({ ...s, referencia_tipo: "ACTIVO", item_id: "", activo_id: "" }))} />
                <span className="form-check-label small">Activo seriado</span>
              </label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label small fw-semibold">{f.referencia_tipo === "ACTIVO" ? "Activo" : "Ítem"} *</label>
            <input className="form-control form-control-sm mb-2" placeholder="Buscar por nombre, código o serial…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <select className="form-select" size={Math.min(filtrados.length + 1, 6)} value={f.referencia_tipo === "ACTIVO" ? f.activo_id : f.item_id} onChange={(e) => setF((s) => ({ ...s, item_id: e.target.value, activo_id: e.target.value }))}>
              <option value="">— Selecciona —</option>
              {filtrados.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre || o.codigo} {f.referencia_tipo === "ITEM" ? `(${o.marca?.nombre || ""}${o.modelo?.nombre ? " " + o.modelo.nombre : ""}) · stock ${o.cantidad_stock}` : `(${o.marca?.nombre || ""} ${o.modelo?.nombre || ""}) · stock ${o.cantidad_stock ?? 0}`}
                </option>
              ))}
            </select>
            {filtrados.length > 5 && <small className="text-secondary">Mostrando {Math.min(filtrados.length, 5)} de {filtrados.length}…</small>}
          </div>
          {!esAjuste && (
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Cantidad *</label>
              <input type="number" min="1" className="form-control" value={f.cantidad} onChange={(e) => setF((s) => ({ ...s, cantidad: Number(e.target.value) }))} />
              {stockUbicacion !== null && f.ubicacion_id ? (
                <small className="text-secondary">Disponible en esa ubicación: {stockUbicacion}</small>
              ) : stockActual !== null ? (
                <small className="text-secondary">Disponible: {stockActual}</small>
              ) : null}
            </div>
          )}
          {esAjuste && (
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Nueva existencia (conteo) *</label>
              <input type="number" min="0" className="form-control" value={f.nuevo_stock} onChange={(e) => setF((s) => ({ ...s, nuevo_stock: e.target.value }))} placeholder="0" />
              {seleccionado && (
                <small className="text-secondary">
                  Actual: {stockUbicacion !== null && f.ubicacion_id ? `en ubicación ${stockUbicacion} / ` : ""}{stockActual}
                </small>
              )}
            </div>
          )}
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Ubicación</label>
            <select className="form-select" value={f.ubicacion_id} onChange={(e) => setF((s) => ({ ...s, ubicacion_id: e.target.value }))}>
              <option value="">— Sin ubicación —</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}{u.sede?.nombre ? ` (${u.sede.nombre})` : ""}</option>
              ))}
            </select>
            {esAjuste && f.referencia_tipo === "ITEM" && (seleccionado?.ubicaciones || []).length > 0 && <small className="text-warning">Obligatoria: el ítem tiene existencias por ubicación.</small>}
          </div>
          {esEntrada && (
            <div className="col-md-6">
              <label className="form-label small">Proveedor</label>
              <select className="form-select" value={f.proveedor_id} onChange={(e) => setF((s) => ({ ...s, proveedor_id: e.target.value }))}>
                <option value="">—</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
          {!esAjuste && (
            <div className="col-md-6">
              <label className="form-label small">{esEntrada ? "Documento (factura/remisión)" : "Documento / cliente"}</label>
              <input className="form-control" value={f.documento} onChange={(e) => setF((s) => ({ ...s, documento: e.target.value }))} placeholder="Ej: FACT-0001" />
            </div>
          )}
          {esAjuste && (
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Motivo del ajuste *</label>
              <input className="form-control" value={f.motivo} onChange={(e) => setF((s) => ({ ...s, motivo: e.target.value }))} placeholder="Ej: Conteo físico de bodega" />
            </div>
          )}
          {!esEntrada && !esAjuste && (
            <div className="col-md-6">
              <label className="form-label small">Destino *</label>
              <input className="form-control" value={f.destino} onChange={(e) => setF((s) => ({ ...s, destino: e.target.value }))} placeholder="Ej: Punto Centro Comercial" />
            </div>
          )}
          {!esAjuste && (
            <div className="col-md-6">
              <label className="form-label small">{esEntrada ? "Valor de entrada" : "Valor de salida"}</label>
              <input type="number" className="form-control" value={f.valor} onChange={(e) => setF((s) => ({ ...s, valor: e.target.value }))} placeholder="0" />
            </div>
          )}
          <div className="col-12">
            <label className="form-label small">Observaciones</label>
            <input className="form-control" value={f.observaciones} onChange={(e) => setF((s) => ({ ...s, observaciones: e.target.value }))} />
          </div>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className={`btn btn-sm ${esAjuste ? "btn-warning" : esEntrada ? "btn-success" : "btn-brand"}`} disabled={busy || itemsBusy} onClick={guardar}>
          {busy ? <span className="spinner-border spinner-border-sm" /> : esAjuste ? "Registrar ajuste" : esEntrada ? "Registrar entrada" : "Registrar salida"}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------- modal ítem */
function ItemModal({ open, modal, categorias, marcas, modelos, busy, onClose, onConfirm }) {
  const [f, setF] = useState(VACIO);
  const esEditar = !!modal?.item;

  useEffect(() => {
    if (open) {
      const it = modal?.item || {};
      setF({
        nombre: it.nombre || "",
        tipo: it.tipo || "EQUIPO",
        codigo: it.codigo || "",
        marca_id: it.marca_id ?? "",
        modelo_id: it.modelo_id ?? "",
        categoria_id: it.categoria_id ?? "",
        stock_minimo: it.stock_minimo ?? 0,
        valor_unitario: it.valor_unitario ?? "",
      });
    }
  }, [open, modal]);

  const modelosMarca = modelos.filter((m) => String(m.marca_id) === String(f.marca_id));

  const guardar = () => {
    if (!f.nombre.trim()) return;
    onConfirm(
      {
        nombre: f.nombre.trim(),
        tipo: f.tipo,
        codigo: f.codigo || undefined,
        marca_id: f.marca_id ? Number(f.marca_id) : undefined,
        modelo_id: f.modelo_id ? Number(f.modelo_id) : undefined,
        categoria_id: f.categoria_id ? Number(f.categoria_id) : undefined,
        stock_minimo: f.stock_minimo || 0,
        valor_unitario: f.valor_unitario === "" ? undefined : Number(f.valor_unitario),
      },
      modal?.item?.id
    );
  };

  return (
    <Modal open={open} title={esEditar ? "Editar ítem" : "Nuevo ítem"} icon="boxes" size="lg" busy={busy} onClose={onClose}>
      {!open ? null : (
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label small fw-semibold">Nombre *</label>
            <input className="form-control" value={f.nombre} onChange={(e) => setF((s) => ({ ...s, nombre: e.target.value }))} placeholder="Ej: Computador todo-en-uno" />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Código</label>
            <input className="form-control" value={f.codigo} onChange={(e) => setF((s) => ({ ...s, codigo: e.target.value }))} placeholder="SKU-001" />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Tipo</label>
            <select className="form-select" value={f.tipo} onChange={(e) => setF((s) => ({ ...s, tipo: e.target.value }))}>
              <option value="EQUIPO">EQUIPO</option>
              <option value="ACCESORIO">ACCESORIO</option>
              <option value="CONSUMIBLE">CONSUMIBLE</option>
              <option value="PLANTA">PLANTA</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Categoría</label>
            <select className="form-select" value={f.categoria_id} onChange={(e) => setF((s) => ({ ...s, categoria_id: e.target.value }))}>
              <option value="">—</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Marca</label>
            <select className="form-select" value={f.marca_id} onChange={(e) => setF((s) => ({ ...s, marca_id: e.target.value, modelo_id: "" }))}>
              <option value="">—</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Modelo</label>
            <select className="form-select" value={f.modelo_id} disabled={!f.marca_id} onChange={(e) => setF((s) => ({ ...s, modelo_id: e.target.value }))}>
              <option value="">—</option>
              {modelosMarca.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Stock mínimo</label>
            <input type="number" min="0" className="form-control" value={f.stock_minimo} onChange={(e) => setF((s) => ({ ...s, stock_minimo: Number(e.target.value) }))} />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Valor unitario</label>
            <input type="number" className="form-control" value={f.valor_unitario} onChange={(e) => setF((s) => ({ ...s, valor_unitario: e.target.value }))} placeholder="$ 0" />
          </div>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>
          {esEditar ? "Guardar cambios" : "Crear ítem"}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------- modal historial */
function HistorialModal({ open, item, canAnular, onAnular, onClose }) {
  const [state, setState] = useState({ loading: false, items: [], total: 0, error: "" });

  useEffect(() => {
    if (!open || !item) return;
    let v = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    const url = item.refTipo === "ACTIVO"
      ? `/stock/movimientos?activo_id=${item.refId}&page=1&size=50`
      : `/stock/items/${item.refId}/movimientos?page=1&size=50`;
    api.get(url)
      .then(({ data }) => {
        if (v) setState({ loading: false, items: data.items || data || [], total: data.total ?? (data.items || []).length, error: "" });
      })
      .catch((e) => {
        if (v) setState({ loading: false, items: [], total: 0, error: e.message });
      });
    return () => { v = false; };
  }, [open, item]);

  return (
    <Modal open={open} title={`Historial · ${item?.titulo || ""}`} icon="clock-history" size="lg" onClose={onClose}>
      {!open ? null : state.loading ? (
        <LoadingBlock />
      ) : state.error ? (
        <div className="text-danger small">No se pudo cargar el historial: {state.error}</div>
      ) : state.items.length === 0 ? (
        <EmptyState icon="clock-history" title="Sin movimientos" hint="Este ítem aún no tiene movimientos de stock" />
      ) : (
        <div className="eticos-table-wrap">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light"><tr>
              <th>Número</th><th>Fecha</th><th>Tipo</th><th className="text-center">Cantidad</th><th>Ubicación</th><th>Motivo / Obs.</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody>
              {state.items.map((m) => (
                <tr key={m.id}>
                  <td><span className="fw-semibold">{m.numero}</span></td>
                  <td className="text-secondary small">{fmtDateTime(m.fecha)}</td>
                  <td><Badge estado={estadoInfo(m.tipo)} /></td>
                  <td className="text-center fw-semibold">
                    {m.tipo === "AJUSTE" ? (
                      <span title="Antes → nuevo"><span className="text-secondary">{m.stock_anterior ?? m.cantidad}</span> <i className="bi bi-arrow-right small"></i> <span className="text-brand">{m.nuevo_stock ?? m.cantidad}</span></span>
                    ) : (
                      m.cantidad
                    )}
                  </td>
                  <td className="small">{m.ubicacion?.nombre || "—"}</td>
                  <td className="small">{m.motivo || m.observaciones || "—"}</td>
                  <td><Badge estado={estadoInfo(m.estado)} /></td>
                  <td className="text-end text-nowrap">
                    {canAnular && m.estado !== "ANULADO" && (
                      <button className="btn btn-sm btn-light" title="Anular" onClick={() => onAnular({ id: m.id, numero: m.numero, motivo: "" })}>
                        <i className="bi bi-x-octagon text-danger"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}