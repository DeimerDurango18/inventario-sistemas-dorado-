import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function SideLink({ to, icon, label, end = false }) {
  return (
    <li className="nav-item">
      <NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
        <i className={`bi bi-${icon} me-2`}></i>
        {label}
      </NavLink>
    </li>
  );
}

export default function MainLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const roles = (user.roles || []).map((r) => r.nombre).join(", ");

  return (
    <div className="d-flex">
      <nav className="eticos-sidebar d-flex flex-column col-2 col-lg-2 col-xl-2">
        <div className="brand d-flex align-items-center gap-2">
          <i className="bi bi-hdd-network-fill fs-4"></i>
          <div className="lh-1">
            <div>ETICOS</div>
            <small className="fw-light" style={{ fontSize: 12 }}>
              GestiÃ³n de Activos TI
            </small>
          </div>
        </div>
        <ul className="nav flex-column mt-2">
          <li className="group-label">OperaciÃ³n</li>
          <SideLink to="/" end icon="speedometer2" label="Dashboard" />
          <SideLink to="/activos" icon="pc-display" label="Activos TI" />
          <SideLink to="/geografia" icon="geo-alt" label="Sedes y Ubicaciones" />
          {can("gestionar_catalogos") && <SideLink to="/catalogos" icon="grid-1x2" label="CatÃ¡logos" />}
          {can("gestionar_usuarios") && (
            <>
              <li className="group-label">AdministraciÃ³n</li>
              <SideLink to="/usuarios" icon="people" label="Usuarios y roles" />
            </>
          )}
        </ul>
      </nav>
<main className="flex-grow-1 p-3 p-md-4" style={{ minHeight: "100vh" }}>
        <div className="eticos-topbar d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold"></h6>
          <div className="d-flex align-items-center gap-2">
            <div className="text-end lh-1">
              <div className="fw-semibold">{user.nombre}</div>
              <small className="text-secondary">{roles}</small>
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Cerrar sesión"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}