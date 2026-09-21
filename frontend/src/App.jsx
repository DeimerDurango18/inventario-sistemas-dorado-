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

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center mt-5">Cargandoâ€¦</div>;
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
          <Route path="catalogos" element={<Catalogos />} />
          <Route path="geografia" element={<Geografia />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}