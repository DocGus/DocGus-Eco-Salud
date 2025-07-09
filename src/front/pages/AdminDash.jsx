import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const AdminDash = () => {
  const [userData, setUserData] = useState(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/private`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Error cargando datos de usuario");
        const data = await res.json();
        setUserData(data.user);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div>
      <h2>Panel del Administrador</h2>

      {userData ? (
        <UserInfoCard user={userData} />
      ) : (
        <p>Cargando datos del usuario...</p>
      )}

      {/* Puedes agregar otras secciones aquí debajo si deseas */}
      <p className="mt-3">Selecciona "Usuarios" en el menú izquierdo para ver la tabla de usuarios.</p>
    </div>
  );
};

export default AdminDash;
