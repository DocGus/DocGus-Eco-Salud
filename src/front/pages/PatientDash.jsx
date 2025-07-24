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
      <h2>Mi Dashboard (Paciente)</h2>
      <UserInfoCard user={user} />
      <p>Desde el panel lateral puedes solicitar estudiante, confirmar tu expediente y ver avances.</p>
    </div>
  );
};

export default PatientDash;
