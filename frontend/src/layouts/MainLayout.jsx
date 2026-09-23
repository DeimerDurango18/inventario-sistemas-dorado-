import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV, navFor } from "../nav";
import api from "../api/client";
import { Modal } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { initials } from "../utils/format";

function SideLink({ to, icon, label, end = false, onNavigate }) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
      <i className={`bi bi-${icon}`}></i>
      <span>{label}</span>
    </NavLink>
  );
}

function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = () => {
    api.get("/notificaciones?limit=6").then((r) => setItems(r.data?.items || r.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      clearInterval(id);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  const unread = items.filter((i) => !i.leida).length;

  const markRead = (n) => {
    if (n.leida) return;
    api.put(`/notificaciones/${n.id}/leer`, {}).then(load).catch(() => {});
  };

  return (
    <div className="position-relative" ref={boxRef}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} title="Notificaciones">
        <i className="bi bi-bell"></i>
        {unread > 0 && <span className="badge-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="dropdown-menu eticos-drop show position-absolute end-0 mt-2">
          <div className="px-2 py-1 fw-semibold d-flex align-items-center gap-2">
            <i className="bi bi-bell-fill text-primary"></i> Notificaciones
            <span className="ms-auto text-secondary small">{unread} sin leer</span>
          </div>
          <div className="mt-1" style={{ maxHeight: 300, overflowY: "auto" }}>
            {items.length === 0 && <div className="text-center text-secondary small py-3">Sin notificaciones</div>}
            {items.map((n) => (
              <button key={n.id} className="notif-item w-100 border-0 bg-transparent text-start" onClick={() => markRead(n)}>
                <i className={`bi ${n.leida ? "bi-envelope" : "bi-envelope-fill text-primary"}`}></i>
                <div className="flex-grow-1">
                  <div className={`small ${n.leida ? "text-secondary" : "fw-semibold"}`}>{n.titulo}</div>
                  <div className="text-secondary" style={{ fontSize: 12 }}>{n.mensaje}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, can } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sideOpen, setSideOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  if (!user) return null;
  const roles = (user.roles || []).map((r) => r.nombre).join(", ");
  const current = navFor(location.pathname);
  const groups = NAV.filter((n) => !n.perm || can(n.perm))
    .reduce((acc, n) => {
      (acc[n.group] = acc[n.group] || []).push(n);
      return acc;
    }, {});

  const logoutNow = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="d-flex">
      {sideOpen && <div className="eticos-modal-backdrop d-lg-none" style={{ zIndex: 1038 }} onClick={() => setSideOpen(false)} />}
      <nav className={`eticos-sidebar ${sideOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">
            <i className="bi bi-hdd-network-fill"></i>
          </div>
          <div className="brand-text">
            <div>ETICOS</div>
            <small>Gestión de Activos TI</small>
          </div>
        </div>
        <ul className="nav flex-column mt-1">
          {Object.entries(groups).map(([group, links]) => (
            <li key={group} className="nav-group">
              <div className="group-label">{group}</div>
              {links.map((l) => (
                <SideLink key={l.to} to={l.to} end={l.end} icon={l.icon} label={l.label} onNavigate={() => setSideOpen(false)} />
              ))}
            </li>
          ))}
        </ul>
        <div className="sidebar-user">
          <div className="et-avatar et-avatar-sm">{initials(user.nombre)}</div>
          <div className="lh-1 small">
            <div className="text-white fw-semibold">{user.nombre}</div>
            <div style={{ fontSize: 11, color: "#7d819c" }}>{user.username}</div>
          </div>
        </div>
      </nav>

      <main className="eticos-main p-3 p-md-4" style={{ minHeight: "100vh" }}>
        <div className="eticos-topbar d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <button className="icon-btn eticos-burger" onClick={() => setSideOpen((s) => !s)}>
              <i className="bi bi-list"></i>
            </button>
            <div className="min-w-0">
              <div className="eticos-breadcrumb">
                {current.group} · <strong>{current.label}</strong>
              </div>
              <div className="d-none d-sm-block fw-bold" style={{ fontSize: 17, lineHeight: 1.1 }}>
                {current.label}
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <NotificationBell />
            <div className="position-relative">
              <button
                className="d-flex align-items-center gap-2 border-0 bg-transparent p-1 rounded-3 eticos-card"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label="Menú de usuario"
              >
                <div className="et-avatar et-avatar-sm">{initials(user.nombre)}</div>
                <div className="text-start d-none d-md-block lh-1">
                  <div className="fw-semibold" style={{ fontSize: 13.5 }}>{user.nombre}</div>
                  <div className="text-secondary" style={{ fontSize: 11 }}>{roles || "Usuario"}</div>
                </div>
                <i className={`bi bi-chevron-${profileOpen ? "up" : "down"} text-secondary small`} />
              </button>
              {profileOpen && <ul className="dropdown-menu show position-absolute end-0 mt-2 eticos-drop eticos-drop-sm" role="menu">
                <li>
                  <Link className="dropdown-item" to="/activos" onClick={() => setProfileOpen(false)}>
                    <i className="bi bi-pc-display me-2 text-primary"></i> Ir a activos
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/configuracion" onClick={() => setProfileOpen(false)}>
                    <i className="bi bi-gear me-2 text-primary"></i> Configuración
                  </Link>
                </li>
                <li>
                  <button className="dropdown-item" onClick={() => { setProfileOpen(false); setPwdOpen(true); }}>
                    <i className="bi bi-shield-lock me-2 text-primary"></i> Cambiar contraseña
                  </button>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item text-danger" onClick={() => { setProfileOpen(false); logoutNow(); }}>
                    <i className="bi bi-box-arrow-right me-2"></i> Cerrar sesión
                  </button>
                </li>
                </ul>}
            </div>
          </div>
        </div>
        <CambiarContrasena open={pwdOpen} onClose={() => setPwdOpen(false)} pushToast={pushToast} />
        <Outlet />
      </main>
    </div>
  );
}

function CambiarContrasena({ open, onClose, pushToast }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", new_password2: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cerrar = () => {
    if (busy) return;
    setError("");
    setForm({ current_password: "", new_password: "", new_password2: "" });
    onClose();
  };

  const guardar = async () => {
    setError("");
    if (form.new_password.length < 10) {
      setError("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (form.new_password !== form.new_password2) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await api.put("/auth/cambio-password", form);
      pushToast("success", "Contraseña actualizada");
      cerrar();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Cambiar contraseña" icon="shield-lock" onClose={cerrar} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={cerrar}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <div className="d-flex flex-column gap-3">
        <div>
          <label className="form-label small fw-semibold">Contraseña actual *</label>
          <input type="password" className="form-control" value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
        </div>
        <div>
          <label className="form-label small fw-semibold">Nueva contraseña *</label>
          <input type="password" className="form-control" value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
        </div>
        <div>
          <label className="form-label small fw-semibold">Confirmar nueva contraseña *</label>
          <input type="password" className="form-control" value={form.new_password2}
            onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && guardar()} />
        </div>
        <div className="form-text">Mínimo 10 caracteres.</div>
      </div>
    </Modal>
  );
}