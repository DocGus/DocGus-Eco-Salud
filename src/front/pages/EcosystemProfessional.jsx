import React from "react";
import RoleInfoCard from "../components/RoleInfoCard";

const EcosystemProfessional = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1 text-center">Profesionales</h1>
                <p className="small mb-0 text-muted-light text-center">Supervisión académica y clínica integrada.</p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <RoleInfoCard
                        title="¿Qué puedes hacer como profesional?"
                        paragraphs={[
                            "En SanArte, podrás validar y supervisar a tus estudiantes, evaluar entrevistas clínicas y revisar antecedentes médicos directamente desde la plataforma.",
                            "Además, contarás con herramientas para administrar tu consultorio, facilitando la gestión administrativa y documental de tus pacientes y estudiantes en un solo lugar.",
                            "SanArte te permite optimizar tu tiempo, mantener tus registros organizados y fortalecer el proceso formativo de quienes se preparan para ejercer la medicina con responsabilidad y empatía."
                        ]}
                        ctaHref="/register?role=professional"
                        ctaLabel="Registrarme como profesional"
                    />
                </section>
            </main>
        </div>
    );
};

export default EcosystemProfessional;
