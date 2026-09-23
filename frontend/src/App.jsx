import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import ActivosList from "./pages/activos/List";
import ActivoForm from "./pages/activos/Form";
import ActivoDetail from "./pages/activos/Detail";
import Catalogos from "./pages/catalogos/index";
import Geografia from "./pages/geografia/index";
import Usuarios from "./pages/usuarios/index";
import Movimientos from "./pages/ops/movimientos";
import Stock from "./pages/stock/index";
import Mantenimientos from "./pages/ops/mantenimientos";
import Prestamos from "./pages/ops/prestamos";
import Bajas from "./pages/ops/bajas";
import Tickets from "./pages/ops/tickets";
import Instalaciones from "./pages/ops/instalaciones";
import Atenciones from "./pages/ops/atenciones";
import Actas from "./pages/ops/actas";
import Reportes from "./pages/admin/reportes";
import Auditoria from "./pages/admin/auditoria";
import Configuracion from "./pages/admin/configuracion";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="spinner-border eticos-spinner" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <MainLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="activos" element={<ActivosList />} />
          <Route path="activos/nuevo" element={<ActivoForm />} />
          <Route path="activos/:id/editar" element={<ActivoForm />} />
          <Route path="activos/:id" element={<ActivoDetail />} />
          <Route path="movimientos" element={<Movimientos />} />
          <Route path="stock" element={<Stock />} />
          <Route path="mantenimientos" element={<Mantenimientos />} />
          <Route path="prestamos" element={<Prestamos />} />
          <Route path="bajas" element={<Bajas />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="instalaciones" element={<Instalaciones />} />
          <Route path="atenciones" element={<Atenciones />} />
          <Route path="actas" element={<Actas />} />
          <Route path="catalogos" element={<Catalogos />} />
          <Route path="geografia" element={<Geografia />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}