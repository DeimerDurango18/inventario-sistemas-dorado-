import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { PageHeader } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const TIPOS = ["COMPUTADOR", "PORTATIL", "IMPRESORA", "RED", "MONITOR", "UPS", "SERVIDOR", "TELEFONIA", "VIDEOVIGILANCIA", "ACCESORIO"];

const MAX_FOTO_BYTES = 1.5 * 1024 * 1024;

function Seccion({ title, icon, children }) {
  return (
    <div className="eticos-card mb-3">
      <div className="p-3 pb-0">
        <h6 className="text-secondary small text-uppercase fw-bold mb-3"><i className={`bi bi-${icon} me-1`}></i>{title}</h6>
        <div className="row g-3 pb-3">{children}</div>
      </div>
    </div>
  );
}

function L({ label, children, col = "col-md-3" }) {
  return (
    <div className={col}>
      <label className="form-label small fw-semibold">{label}</label>
      {children}
    </div>
  );
}

async function archivoArchivoAImagen(file) {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (file.size > MAX_FOTO_BYTES) throw new Error("La imagen supera 1.5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("No se pudo leer la imagen."));
      i.src = url;
    });
    const MAX = 900;
    let { width, height } = img;
    const escala = Math.min(1, MAX / Math.max(width, height));
    width = Math.round(width * escala);
    height = Math.round(height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ActivoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const editando = Boolean(id);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    tipo: "COMPUTADOR",
    categoria_id: "",
    subcategoria_id: "",
    marca_id: "",
    modelo_id: "",
    serial: "",
    codigo_inventario: "",
    placa: "",
    estado_id: "",
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

  const [foto, setFoto] = useState(null);
  const [fotoEditada, setFotoEditada] = useState(() => !editando);
  const [defAtributos, setDefAtributos] = useState([]);
  const [valAtributos, setValAtributos] = useState({});

  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [estados, setEstados] = useState([]);
  const [danger, setDanger] = useState("");
  const [busy, setBusy] = useState(false);

  const cargar = async () => {
    const [c, ma, p, r, u, e] = await Promise.all([
      api.get("/catalogo/categorias/todas"),
      api.get("/catalogo/marcas?size=500"),
      api.get("/catalogo/proveedores?size=500"),
      api.get("/activos/responsables?activo=true"),
      api.get("/geo/ubicaciones"),
      api.get("/catalogo/estados"),
    ]);
    setCategorias(c.data?.items || c.data || []);
    setMarcas(ma.data?.items || []);
    setProveedores(p.data?.items || []);
    setResponsables(r.data || []);
    setUbicaciones(u.data || []);
    setEstados(e.data || []);
  };

  const cargarAtributos = async (subcategoriaId, prefill) => {
    if (!subcategoriaId) {
      setDefAtributos([]);
      setValAtributos({});
      return;
    }
    const { data } = await api.get(`/catalogo/atributos?subcategoria_id=${subcategoriaId}`);
    const defs = data || [];
    setDefAtributos(defs);
    const mapa = {};
    (defs || []).forEach((d) => {
      const prev = (prefill || []).find((p) => p.atributo_definicion_id === d.id);
      mapa[d.id] = prev ? String(prev.valor) : "";
    });
    setValAtributos(mapa);
  };

  useEffect(() => {
    cargar();
    if (editando) {
      api.get(`/activos/${id}`).then(({ data }) => {
        setForm((f) => ({
          ...f,
          tipo: data.tipo || "COMPUTADOR",
          categoria_id: data.categoria_id || "",
          subcategoria_id: data.subcategoria_id || "",
          marca_id: data.marca_id || "",
          modelo_id: data.modelo_id || "",
          serial: data.serial || "",
          codigo_inventario: data.codigo_inventario || "",
          placa: data.placa || "",
          estado_id: data.estado_id || "",
          factura_numero: data.factura_numero || "",
          valor_adquisicion: data.valor_adquisicion ?? "",
          fecha_adquisicion: (data.fecha_adquisicion || "").slice(0, 10),
          garantia_meses: data.garantia_meses ?? "",
          fecha_fin_garantia: (data.fecha_fin_garantia || "").slice(0, 10),
          proveedor_id: data.proveedor_id || "",
          responsable_id: data.responsable_id || "",
          ubicacion_id: data.ubicacion_id || "",
          observaciones: data.observaciones || "",
        }));
        if (data.foto) setFoto(data.foto);
        setFotoEditada(false);
        cargarModelos(data.marca_id || "");
        if (data.subcategoria_id) cargarAtributos(data.subcategoria_id, data.atributos_valores || []);
      }).catch((e) => setDanger(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const elegirFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await archivoArchivoAImagen(file);
      setFoto(dataUrl);
      setFotoEditada(true);
    } catch (err) {
      pushToast("error", err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const quitarFoto = () => {
    setFoto(null);
    setFotoEditada(true);
  };

  const onSubcategoria = (v) => {
    set("subcategoria_id", v);
    cargarAtributos(v, null);
  };

  const setAttr = (defId, v) => setValAtributos((m) => ({ ...m, [defId]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setDanger("");
    const payload = { ...form };
    ["categoria_id", "subcategoria_id", "marca_id", "modelo_id", "proveedor_id", "responsable_id", "ubicacion_id", "garantia_meses", "estado_id"].forEach((k) => {
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

    if (editando && fotoEditada) payload.foto = foto || null;
    if (!editando) payload.foto = foto || null;

    const atributos = [];
    defAtributos.forEach((d) => {
      const v = (valAtributos[d.id] ?? "").trim();
      if (v !== "") {
        atributos.push({ atributo_definicion_id: d.id, valor: v });
      }
    });
    if (atributos.length) payload.atributos = atributos;

    try {
      if (editando) await api.put(`/activos/${id}`, payload);
      else await api.post("/activos", payload);
      pushToast("success", editando ? "Activo actualizado" : "Activo creado");
      navigate(editando ? `/activos/${id}` : "/activos");
    } catch (err) {
      setDanger(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renderAtributoInput = (def) => {
    const val = valAtributos[def.id] ?? "";
    if (def.tipo_dato === "numerico") return <input type="number" className="form-control" value={val} onChange={(e) => setAttr(def.id, e.target.value)} />;
    if (def.tipo_dato === "booleano") {
      return (
        <div className="form-check form-switch mt-1">
          <input className="form-check-input" type="checkbox" id={`atr-${def.id}`} checked={val === "true"} onChange={(e) => setAttr(def.id, e.target.checked ? "true" : "false")} />
          <label className="form-check-label small" htmlFor={`atr-${def.id}`}>Sí</label>
        </div>
      );
    }
    if (def.tipo_dato === "fecha") return <input type="date" className="form-control" value={val} onChange={(e) => setAttr(def.id, e.target.value)} />;
    return <input className="form-control" value={val} onChange={(e) => setAttr(def.id, e.target.value)} />;
  };

  return (
    <div>
      <PageHeader
        title={editando ? "Editar activo" : "Nuevo activo"}
        subtitle={editando ? `#${id}` : "Registro de equipo de TI"}
        icon={editando ? "pencil" : "plus-circle"}
      />
      {danger && <div className="alert alert-danger py-2 small">{danger}</div>}

      <form onSubmit={submit}>
        <Seccion title="Identificación" icon="card-heading">
          <L label="Tipo *"><select className="form-select" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></L>
          <L label="Categoría"><select className="form-select" value={form.categoria_id} onChange={(e) => { set("categoria_id", e.target.value); onSubcategoria(""); }}><option value="">—</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></L>
          <L label="Subcategoría"><select className="form-select" value={form.subcategoria_id} onChange={(e) => onSubcategoria(e.target.value)}><option value="">—</option>{subcategorias.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></L>
          <L label="Estado"><select className="form-select" value={form.estado_id} onChange={(e) => set("estado_id", e.target.value)}><option value="">—</option>{estados.map((e2) => <option key={e2.id} value={e2.id}>{e2.nombre}</option>)}</select></L>
          <L label="Serial"><input className="form-control" value={form.serial} onChange={(e) => set("serial", e.target.value)} /></L>
          <L label="Código inventario"><input className="form-control" value={form.codigo_inventario} onChange={(e) => set("codigo_inventario", e.target.value)} /></L>
          <L label="Placa"><input className="form-control" value={form.placa} onChange={(e) => set("placa", e.target.value)} /></L>
          <L label="Marca"><select className="form-select" value={form.marca_id} onChange={(e) => { set("marca_id", e.target.value); set("modelo_id", ""); cargarModelos(e.target.value); }}><option value="">—</option>{marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></L>
          <L label="Modelo"><select className="form-select" value={form.modelo_id} onChange={(e) => set("modelo_id", e.target.value)}><option value="">—</option>{modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></L>
        </Seccion>

        <Seccion title="Fotografía" icon="camera">
          <div className="col-md-6">
            {foto ? (
              <div className="d-flex align-items-start gap-3">
                <img src={foto} alt="Vista previa" className="rounded eticos-foto-preview" style={{ width: 180, height: 135, objectFit: "cover" }} />
                <div className="d-flex flex-column gap-2">
                  <button type="button" className="btn btn-sm btn-light" onClick={() => fileRef.current?.click()}><i className="bi bi-arrow-repeat me-1" />Cambiar</button>
                  <button type="button" className="btn btn-sm btn-light text-danger" onClick={quitarFoto}><i className="bi bi-trash3 me-1" />Quitar foto</button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => fileRef.current?.click()}>
                <i className="bi bi-camera me-1" />{editando ? "Agregar foto" : "Adjuntar foto"}
              </button>
            )}
            <div className="form-text">JPG o PNG de hasta 1.5 MB. Se ajusta automáticamente.</div>
            <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={elegirFoto} />
          </div>
        </Seccion>

        <Seccion title="Ubicación y responsables" icon="geo-alt">
          <L label="Ubicación" col="col-md-4"><select className="form-select" value={form.ubicacion_id} onChange={(e) => set("ubicacion_id", e.target.value)}><option value="">—</option>{ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.sede?.nombre} / {u.nombre}</option>)}</select></L>
          <L label="Responsable" col="col-md-4"><select className="form-select" value={form.responsable_id} onChange={(e) => set("responsable_id", e.target.value)}><option value="">—</option>{responsables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></L>
          <L label="Proveedor" col="col-md-4"><select className="form-select" value={form.proveedor_id} onChange={(e) => set("proveedor_id", e.target.value)}><option value="">—</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></L>
        </Seccion>

        {defAtributos.length > 0 && (
          <Seccion title="Atributos específicos" icon="sliders">
            {defAtributos.map((d) => (
              <L key={d.id} label={d.nombre + (d.requerido ? " *" : "")} col="col-md-4">
                {renderAtributoInput(d)}
              </L>
            ))}
          </Seccion>
        )}

        <Seccion title="Adquisición y garantía" icon="receipt">
          <L label="Factura"><input className="form-control" value={form.factura_numero} onChange={(e) => set("factura_numero", e.target.value)} /></L>
          <L label="Valor de compra"><input type="number" step="0.01" className="form-control" value={form.valor_adquisicion} onChange={(e) => set("valor_adquisicion", e.target.value)} /></L>
          <L label="Fecha adquisición"><input type="date" className="form-control" value={form.fecha_adquisicion} onChange={(e) => set("fecha_adquisicion", e.target.value)} /></L>
          <L label="Garantía (meses)"><input type="number" className="form-control" value={form.garantia_meses} onChange={(e) => set("garantia_meses", e.target.value)} /></L>
          <L label="Fin de garantía" col="col-md-6"><input type="date" className="form-control" value={form.fecha_fin_garantia} onChange={(e) => set("fecha_fin_garantia", e.target.value)} /></L>
        </Seccion>

        <Seccion title="Notas" icon="card-text">
          <div className="col-12"><textarea className="form-control" rows={3} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} /></div>
        </Seccion>

        <div className="d-flex gap-2">
          <button className="btn btn-brand" disabled={busy}>
            {busy ? <><span className="spinner-border spinner-border-sm me-1" />Guardando…</> : "Guardar"}
          </button>
          <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}