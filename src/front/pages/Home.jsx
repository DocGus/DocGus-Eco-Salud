import React from "react";
import { Link } from "react-router-dom";

export const Home = () => {
  return (
    <div
      className="container-fluid d-flex flex-column"
      style={{ minHeight: "100vh", backgroundColor: "#800000", color: "#fff", padding: "0" }}
    >
      {/* Header */}
      <header className="py-2 text-center">
        <h1 className="h5 mb-1">Ecosistema Digital para Atención en Salud</h1>
        <p className="small mb-0">Gestión de Expedientes Médicos</p>
      </header>

      {/* Main */}
      <main
        className="container text-center"
        style={{
          flex: "0 1 auto",
          padding: "1rem 0",
        }}
      >
        <div className="row row-cols-1 row-cols-md-3 g-2">
          <div className="col">
            <Link to="/academic-info" className="text-decoration-none text-white">
              <div className="card h-100 text-white bg-dark border-light">
                <div className="card-body p-2">
                  <h6 className="card-title mb-1">Antecedentes del Paciente</h6>
                  <p className="card-text small mb-0">Academia</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col">
            <Link to="/professional-info" className="text-decoration-none text-white">
              <div className="card h-100 text-white bg-dark border-light">
                <div className="card-body p-2">
                  <h6 className="card-title mb-1">Consulta en Salud</h6>
                  <p className="card-text small mb-0">Profesional en Salud</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col">
            <Link to="/multidisciplinary-info" className="text-decoration-none text-white">
              <div className="card h-100 text-white bg-dark border-light">
                <div className="card-body p-2">
                  <h6 className="card-title mb-1">Atención Multidisciplinaria</h6>
                  <p className="card-text small mb-0">Equipo de Profesionales en Salud</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-2 d-flex justify-content-center flex-wrap gap-1">
          <Link to="/register?role=student" className="btn btn-light btn-sm text-dark">
            Registro de Estudiante
          </Link>
          <Link to="/register?role=professional" className="btn btn-light btn-sm text-dark">
            Registro de Profesional
          </Link>
          <Link to="/register?role=patient" className="btn btn-light btn-sm text-dark">
            Registro de Paciente
          </Link>
        </div>

        <div className="mt-2">
          <Link to="/login" className="btn btn-light btn-sm text-dark">Iniciar Sesión</Link>
        </div>
      </main>

      {/* Footer opcional */}
      <footer className="text-center py-2 mt-auto small">
        &copy; 2025 Expedientes Médicos. Todos los derechos reservados.
      </footer>
    </div>
  );
};
