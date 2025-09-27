import React from "react";
import logo from "../assets/img/sansanarte.png";
import { Link } from "react-router-dom";

// Página de inicio con acceso rápido a áreas clave del ecosistema.
// Estructura: Layout a pantalla completa, cabecera, grid de tarjetas y CTAs.

export const Home = () => {
  return (
    <div
      className="container-fluid d-flex flex-column position-relative"
      style={{ minHeight: "100vh", backgroundColor: "var(--brand-bg)", color: "#fff", padding: "0" }}
    >
      {/* Header: título y tagline */}
      <header className="py-2 text-center page-foreground">
        <h1 className="mb-1">Ecosistema Digital para Atención en Salud</h1>
        <p className="small mb-0">Gestión de Expedientes Médicos</p>
      </header>

      {/* Main: grid de navegación por áreas y botones de registro/login */}
      <main
        className="container text-center page-foreground"
        style={{
          flex: "0 1 auto",
          padding: "1rem 0",
        }}
      >
        {/* Párrafo cálido y breve que explica el propósito */}
        <p className="small mb-3" style={{ maxWidth: 720, margin: "0 auto" }}>
          Bienvenido. Este ecosistema reúne a estudiantes, profesionales y equipos multidisciplinarios
          para construir y confirmar expedientes claros, seguros y útiles para el cuidado de la salud.
        </p>

        {/* Tarjetas de acceso rápido a secciones (rutas informativas) */}
        <div className="row row-cols-1 row-cols-md-3 g-2">
          <div className="col">
            <Link to="/ecosistema/academico" className="text-decoration-none text-white">
              <div className="card h-100 brand-form-card">
                <div className="card-body p-2">
                  <h6 className="card-title mb-1">Antecedentes del Paciente</h6>
                  <p className="card-text small mb-0">Academia</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col">
            <Link to="/ecosistema/profesional" className="text-decoration-none text-white">
              <div className="card h-100 brand-form-card">
                <div className="card-body p-2">
                  <h6 className="card-title mb-1">Consulta en Salud</h6>
                  <p className="card-text small mb-0">Profesional en Salud</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col">
            <Link to="/ecosistema/multidisciplinario" className="text-decoration-none text-white">
              <div className="card h-100 brand-form-card">
                <div className="card-body p-2">
                  <h6 className="card-title mb-1">Atención Multidisciplinaria</h6>
                  <p className="card-text small mb-0">Equipo de Profesionales en Salud</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* CTAs de registro segmentados por rol (student/professional/patient) */}
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

        {/* (El botón antiguo de iniciar sesión fue removido) */}
      </main>

      {/* Logo grande al fondo de la página (clickable) + botón de Iniciar Sesión */}
      <div className="text-center page-foreground pb-3 brand-bottom-cta">
        <Link to="/login" aria-label="Iniciar sesión" className="btn btn-outline-light btn-brand-large">
          <img src={logo} alt="SanArte" />
          <span className="fw-semibold">Iniciar sesión</span>
        </Link>
      </div>

      {/* Footer: aviso de derechos reservado y año */}
      <footer className="text-center py-2 mt-auto small">
        &copy; 2025 Expedientes Médicos. Todos los derechos reservados.
      </footer>
    </div>
  );
};
