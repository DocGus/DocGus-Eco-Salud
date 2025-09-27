import React from "react";

const EcosystemProfessional = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1 text-center">Consulta Profesional</h1>
                <p className="small mb-0 text-muted-light">Revisión ágil con trazabilidad y control de calidad.</p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <h5>¿Para quién es?</h5>
                    <p className="text-muted-light">Profesionales de la salud que supervisan y validan expedientes.</p>
                </section>

                <section className="mt-3">
                    <h5>Descripción</h5>
                    <ul>
                        <li>Lista de expedientes en estado review.</li>
                        <li>Visualización de snapshot para validar contenido rápidamente.</li>
                        <li>Acciones: aprobar o regresar a progreso con comentario.</li>
                    </ul>
                </section>
            </main>
        </div>
    );
};

export default EcosystemProfessional;
