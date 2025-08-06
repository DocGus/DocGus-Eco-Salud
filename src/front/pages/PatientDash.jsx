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
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error("Error al cargar usuario:", err);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="patient-dash">
      <h2>Mi Expediente de Salud (Paciente)</h2>
      <UserInfoCard user={user} />
      <p>-Desde el panel lateral puedes solicitar a traves 
        del Numero de Usuario que un Estudiante del area de la Salud te contacte 
        y te atienda haciendo una entrevista sobre tus antecedentes en salud</p>
        <p>-Tambien puedes ver el estatus de tu expediente ya sea en progreso, que 
        es cuando el estudiante ya acepto realizarla, en revision cuando ya se realizo 
        y envio a un profesional para que lo revise y finalmente en confirmado cuando se 
        te envia a ti mismo ya revisado para que lo pases si estas de acuerdo al 
        estatus confirmado.
        </p>
    </div>
  );
};

export default PatientDash;
