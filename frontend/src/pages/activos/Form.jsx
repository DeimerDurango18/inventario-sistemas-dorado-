import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";

const TIPOS = ["COMPUTADOR", "PORTATIL", "IMPRESORA", "RED", "MONITOR", "UPS", "SERVIDOR", "TELEFONIA", "VIDEOVIGILANCIA", "ACCESORIO"];

export default function ActivoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);

  const [form, setForm] = useState({
    tipo: "COMPUTADOR",
    categoria_id: "",
    subcategoria_id: "",
    marca_id: "",
    modelo_id: "",
    serial: "",
    codigo_inventario: "",
    placa: "",
    factura_numero: "",
    valor_adquisicion: "",
    fecha_adquisicion: "",
    garantia_meses: "",
    fecha_fin_garantia: "",
    proveedor_id: "",
    responsable_id: "",
    ubicacion_id: "",
    observaciones: "",
  });

  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [danger, setDanger] = useState("");
  const [busy, setBusy] = useState(false);

  const cargar = async () => {
    const [c, ma, p, r, u] = await Promise.all([
      api.get("/catalogo/categorias/todas"),
      api.get("/catalogo/marcas?size=500"),
      api.get("/catalogo/proveedores?size=500"),
      api.get("/activos/responsables?activo=true"),
      api.get("/geo/ubicaciones"),
    ]);
    setCategorias(c.data?.items || c.data || []);
    setMarcas(ma.data?.items || []);
    setProveedores(p.data?.items || []);
    setResponsables(r.data || []);
    setUbicaciones(u.data || []);
  };

  useEffect(() => {
    cargar();
    if (editando) {
      api.get(`/activos/${id}`).then(({ data }) => {
        setForm({
          tipo: data.tipo || "EQUIPO",
          categoria_id: data.categoria_id || "",
          subcategoria_id: data.subcategoria_id || "",
          marca_id: data.marca_id || "",
          modelo_id: data.modelo_id || "",
          serial: data.serial || "",
          codigo_inventario: data.codigo_inventario || "",
          placa: data.placa || "",
          factura_numero: data.factura_numero || "",
          valor_adquisicion: data.valor_adquisicion ?? "",
          fecha_adquisicion: (data.fecha_adquisicion || "").slice(0, 10),
          garantia_meses: data.garantia_meses ?? "",
          fecha_fin_garantia: (data.fecha_fin_garantia || "").slice(0, 10),
          proveedor_id: data.proveedor_id || "",
          responsable_id: data.responsable_id || "",
          ubicacion_id: data.ubicacion_id || "",
          observaciones: data.observaciones || "",
        });
      }).catch((e) => setDanger(e.message));
    }
  }, [id]);

  const subcategorias = useMemo(
    () => categorias.find((c) => c.id === Number(form.categoria_id))?.subcategorias || [],
    [categorias, form.categoria_id]
  );

  const cargarModelos = async (marcaId) => {
    if (!marcaId) {
      setModelos([]);
      return;
    }
    const { data } = await api.get(`/catalogo/modelos?marca_id=${marcaId}`);
    setModelos(data || []);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setDanger("");
    const payload = { ...form };
    ["categoria_id", "subcategoria_id", "marca_id", "modelo_id", "proveedor_id", "responsable_id", "ubicacion_id", "garantia_meses"].forEach((k) => {
      payload[k] = payload[k] === "" ? null : Number(payload[k]);
    });
    payload.valor_adquisicion = payload.valor_adquisicion === "" ? null : Number(payload.valor_adquisicion);
    payload.fecha_adquisicion = payload.fecha_adquisicion || null;
    payload.fecha_fin_garantia = payload.fecha_fin_garantia || null;
    payload.serial = payload.serial || null;
    payload.codigo_inventario = payload.codigo_inventario || null;
    payload.placa = payload.placa || null;
    payload.factura_numero = payload.factura_numero || null;
    payload.observaciones = payload.observaciones || null;

    try {
      if (editando) await api.put(`/activos/${id}`, payload);
      else await api.post("/activos", payload);
      navigate(editando ? `/activos/${id}` : "/activos");
    } catch (err) {
      setDanger(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h5 className="mb-3">{editando ? `Editar activo #${id}` : "Nuevo activo"}</h5>
      {danger && <div className="alert alert-danger py-2">{danger}</div>}
      <form onSubmit={submit}>
        <div className="card stat-card mb-3">
          <div className="card-header bg-white fw-semibold">IdentificaciÃ³n</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">CategorÃ­a</label>
                <select className="form-select form-select-sm" value={form.categoria_id} onChange={(e) => set("categoria_id", e.target.value)}>
                  <option value="">â€”</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">SubcategorÃ­a</label>
                <select className="form-select form-select-sm" value={form.subcategoria_id} onChange={(e) => set("subcategoria_id", e.target.value)}>
                  <option value="">â€”</option>
                  {subcategorias.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Serial</label>
                <input className="form-control form-control-sm" value={form.serial} onChange={(e) => set("serial", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">CÃ³digo inventario</label>
                <input className="form-control form-control-sm" value={form.codigo_inventario} onChange={(e) => set("codigo_inventario", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Placa</label>
                <input className="form-control form-control-sm" value={form.placa} onChange={(e) => set("placa", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Marca</label>
                <select className="form-select form-select-sm" value={form.marca_id} onChange={(e) => { set("marca_id", e.target.value); set("modelo_id", ""); cargarModelos(e.target.value); }}>
                  <option value="">â€”</option>
                  {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Modelo</label>
                <select className="form-select form-select-sm" value={form.modelo_id} onChange={(e) => set("modelo_id", e.target.value)}>
                  <option value="">â€”</option>
                  {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card stat-card mb-3">
          <div className="card-header bg-white fw-semibold">UbicaciÃ³n y responsables</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">UbicaciÃ³n</label>
                <select className="form-select form-select-sm" value={form.ubicacion_id} onChange={(e) => set("ubicacion_id", e.target.value)}>
                  <option value="">â€”</option>
                  {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.sede?.nombre} / {u.nombre}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Responsable</label>
                <select className="form-select form-select-sm" value={form.responsable_id} onChange={(e) => set("responsable_id", e.target.value)}>
                  <option value="">â€”</option>
                  {responsables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Proveedor</label>
                <select className="form-select form-select-sm" value={form.proveedor_id} onChange={(e) => set("proveedor_id", e.target.value)}>
                  <option value="">â€”</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card stat-card mb-3">
          <div className="card-header bg-white fw-semibold">AdquisiciÃ³n y garantÃ­a</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Factura</label>
                <input className="form-control form-control-sm" value={form.factura_numero} onChange={(e) => set("factura_numero", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Valor de compra</label>
                <input type="number" step="0.01" className="form-control form-control-sm" value={form.valor_adquisicion} onChange={(e) => set("valor_adquisicion", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Fecha adquisiciÃ³n</label>
                <input type="date" className="form-control form-control-sm" value={form.fecha_adquisicion} onChange={(e) => set("fecha_adquisicion", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">GarantÃ­a (meses)</label>
                <input type="number" className="form-control form-control-sm" value={form.garantia_meses} onChange={(e) => set("garantia_meses", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="card stat-card mb-3">
          <div className="card-header bg-white fw-semibold">Notas</div>
          <div className="card-body">
            <textarea className="form-control" rows={3} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
          </div>
        </div>

        <div className="d-flex gap-2">
          <button className="btn text-white" style={{ background: "var(--eticos-primary)" }} disabled={busy}>
            {busy ? "Guardandoâ€¦" : "Guardar"}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}