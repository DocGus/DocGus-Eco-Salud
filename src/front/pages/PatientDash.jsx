import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const PatientDash = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/private`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        // Error silencioso para no ensuciar consola en producción
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="app-page" data-bs-theme="dark">
      <header className="page-header">
        <h1 className="h5 mb-1">Mi Expediente de Salud</h1>
        <p className="small mb-0 text-muted-light">Gestiona tu expediente y sigue su estatus.</p>
      </header>
      <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
        <UserInfoCard user={user} />
        <section className="mt-3">
          <p className="text-muted-light mb-2">Desde el menú lateral puedes solicitar atención a un estudiante del área de la salud y dar seguimiento a tu expediente.</p>
          <ul className="text-muted-light">
            <li>En progreso: el estudiante aceptó realizar la entrevista.</li>
            <li>En revisión: el profesional está validando el contenido.</li>
            <li>Confirmado: tu expediente quedó validado y confirmado.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default PatientDash;
