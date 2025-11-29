import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const ProfessionalDash = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  return (
    <div className="app-page" data-bs-theme="dark">
      <header className="page-header">
        <h1 className="h5 mb-1">Panel del Profesional</h1>
        <p className="small mb-0 text-muted-light">Valida estudiantes y revisa expedientes desde el menú lateral.</p>
      </header>
      <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
        <UserInfoCard user={user} />
      </main>
    </div>
  );
};

export default ProfessionalDash;
