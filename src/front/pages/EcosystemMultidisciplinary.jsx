import React from "react";

const EcosystemMultidisciplinary = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1 text-center">Tratamiento Multidisciplinario</h1>
                <p className="small mb-0 text-muted-light">Colaboración integral entre especialidades para enriquecer el expediente.</p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <h5>¿Para quién es?</h5>
                    <p className="text-muted-light">Equipos de salud (nutrición, psicología, rehabilitación, etc.).</p>
                </section>

                <section className="mt-3">
                    <h5>Descripción</h5>
                    <ul>
                        <li>Anotaciones por especialidad y anexos centralizados.</li>
                        <li>Visión integral y continuidad de la atención.</li>
                        <li>Escalable a paneles de equipo y métricas conjuntas.</li>
                    </ul>
                </section>
            </main>
        </div>
    );
};

export default EcosystemMultidisciplinary;
