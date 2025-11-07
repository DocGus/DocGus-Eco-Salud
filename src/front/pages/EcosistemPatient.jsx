const EcosistemPatient = () => {
    return (
        <div className="app-page" data-bs-theme="dark">
            <header className="page-header">
                <h1 className="h5 mb-1">Paciente</h1>
                <p className="small mb-0 text-muted-light">
                    Tu salud, en un espacio digital claro y seguro
                </p>
            </header>

            <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
                <section className="mt-3">
                    <p className="text-muted-light">
                        En SanArte los pacientes pueden solicitar atención médica de uno o varios 
                        especialistas dentro de un entorno confiable y fácil de usar. Al registrarte 
                        tendrás acceso a tu expediente digital y podrás comenzar a explorar la 
                        plataforma de inmediato.
                    </p>
                    <p className="text-muted-light">
                        Una vez registrado, puedes pedir atención directamente. Si nadie te recomendó, 
                        encontrarás en tu página la información de un profesional que podrá orientarte. 
                        En caso de haber sido invitado por un estudiante o profesional, también podrás 
                        solicitar que sea esa persona quien te atienda ingresando su número de usuario 
                        para ser aprobado.
                    </p>
                </section>
            </main>
        </div>
    );
};

export default EcosistemPatient;
            