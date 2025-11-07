import React from "react";
import RoleInfoCard from "../components/RoleInfoCard";

const EcosistemPatient = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1 text-center">Paciente</h1>
                <p className="small mb-0 text-muted-light text-center">
                    Tu salud, en un espacio digital claro y seguro.
                </p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <RoleInfoCard
                        title="¿Qué puedes hacer como paciente?"
                        paragraphs={[
                            "En SanArte, puedes solicitar atención en salud de uno o varios especialistas dentro de un entorno seguro, confiable y fácil de usar.",
                            "Al registrarte, deberás solicitar la recopilación de tus datos de antecedentes de salud, información general que será importante y necesaria en cada una de tus atenciones. Para ello, elige si deseas que te asista un estudiante del área de la salud o un profesional certificado; quien sea asignado te contactará por videollamada para completar tu expediente digital.",
                            "Si no fuiste recomendado por nadie, marca la casilla correspondiente y se te asignará automáticamente un profesional disponible para orientarte. En cambio, si fuiste invitado por un estudiante o profesional, podrás ingresar su número de usuario para que sea esa persona quien te atienda.",
                            "Una vez que tu registro haya sido validado y tus antecedentes de salud confirmados, podrás solicitar atención directamente desde la plataforma."
                        ]}
                        ctaHref="/register?role=patient"
                        ctaLabel="Registrarme como paciente"
                    />
                </section>
            </main>
        </div>
    );
};

export default EcosistemPatient;
