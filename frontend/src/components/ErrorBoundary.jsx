import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("ETICOS UI error", error, info);
  }

  reload = () => window.location.reload();

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="eticos-error-screen">
        <div className="eticos-error-card">
          <div className="et-avatar mx-auto mb-3"><i className="bi bi-exclamation-triangle-fill" /></div>
          <h1 className="h4 fw-bold">Algo salió mal</h1>
          <p className="text-secondary mb-4">La pantalla encontró un error inesperado. Puedes recargar y continuar.</p>
          <button className="btn btn-brand" onClick={this.reload}>
            <i className="bi bi-arrow-clockwise me-2" />Recargar aplicación
          </button>
        </div>
      </main>
    );
  }
}
