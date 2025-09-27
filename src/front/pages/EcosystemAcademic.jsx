import React from "react";

const EcosystemAcademic = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1">Módulo Académico</h1>
                <p className="small mb-0 text-muted-light">Formación aplicada y captura estructurada de antecedentes.</p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <h5>¿Para quién es?</h5>
                    <p className="text-muted-light">Estudiantes de ciencias de la salud que requieren practicar con supervisión y trazabilidad.</p>
                </section>

                <section className="mt-3">
                    <h5>Flujo</h5>
                    <ol>
                        <li>Solicitud de validación a profesional.</li>
                        <li>Asignación de paciente.</li>
                        <li>Llenado guiado de antecedentes.</li>
                        <li>Generación de snapshot automático.</li>
                        <li>Envío a revisión.</li>
                    </ol>
                </section>

                <section className="mt-3">
                    <h5>Funcionalidades</h5>
                    <ul>
                        <li>Normalización de campos y guardado incremental.</li>
                        <li>Snapshot html2canvas para revisión visual.</li>
                        <li>Transiciones de estado: progress → review.</li>
                    </ul>
                </section>
            </main>
        </div>
    );
};

export default EcosystemAcademic;
