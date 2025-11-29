import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const StudentDash = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  return (
    <div className="app-page" data-bs-theme="dark">
      <header className="page-header">
        <h1 className="h5 mb-1">Panel del Estudiante</h1>
        <p className="small mb-0 text-muted-light">Accede a tus funciones desde el menú lateral.</p>
      </header>
      <main className="container" style={{ flex: "0 1 auto", padding: "1rem 0" }}>
        <UserInfoCard user={user} />
      </main>
    </div>
  );
};

export default StudentDash;
