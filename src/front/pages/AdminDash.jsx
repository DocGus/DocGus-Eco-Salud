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
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Error cargando datos de usuario");
        const data = await res.json();
        setUserData(data.user);
      } catch (error) {
        // Error silencioso para no ensuciar consola en producción
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="app-page" data-bs-theme="dark">
      <header className="page-header">
        <h1 className="h5 mb-1">Panel del Administrador</h1>
        <p className="small mb-0 text-muted-light">Configura y monitorea el sistema.</p>
      </header>
      <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
        {userData ? (
          <UserInfoCard user={userData} />
        ) : (
          <p className="text-muted-light">Cargando datos del usuario...</p>
        )}
        <p className="mt-3 text-muted-light">Selecciona &quot;Usuarios&quot; en el menú izquierdo para ver la tabla de usuarios.</p>
      </main>
    </div>
  );
};

export default AdminDash;
