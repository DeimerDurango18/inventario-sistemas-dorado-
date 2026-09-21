import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="card shadow" style={{ width: 380 }}>
        <div className="card-header text-center text-white" style={{ background: "var(--eticos-primary)" }}>
          <h4 className="m-0"><i className="bi bi-hdd-network-fill me-2"></i>ETICOS</h4>
          <small>GestiÃ³n de Activos TI</small>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">ContraseÃ±a</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button className="btn text-white w-100" style={{ background: "var(--eticos-primary)" }} disabled={busy}>
              {busy ? "Ingresandoâ€¦" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}