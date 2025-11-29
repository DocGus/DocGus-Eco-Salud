import React from "react";
import RoleInfoCard from "../components/RoleInfoCard";

const EcosystemMultidisciplinary = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1 text-center">Estudiantes</h1>
                <p className="small mb-0 text-muted-light text-center">Aprende practicando entrevistas clínicas con guía y validación académica.</p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <RoleInfoCard
                        title="¿Qué puedes hacer como estudiante?"
                        paragraphs={[
                            "En SanArte, podrás practicar entrevistas de antecedentes en salud y solicitar la validación de tus registros por parte de tus profesores universitarios.",
                            "Después de registrarte, deberás ingresar el número de usuario de tu profesor para solicitar su validación. Una vez que tu cuenta sea autorizada, podrás recibir solicitudes de pacientes para realizar las entrevistas clínicas; solo necesitas compartir tu número de usuario con quienes desees recomendarte.",
                            "Cuando completes una entrevista, deberás enviarla a revisión con tu profesor. Él podrá evaluarla, solicitar correcciones o autorizarla para que el paciente la confirme o solicite cambios."
                        ]}
                        ctaHref="/register?role=student"
                        ctaLabel="Registrarme como estudiante"
                    />
                </section>
            </main>
        </div>
    );
};

export default EcosystemMultidisciplinary;
