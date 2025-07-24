import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const ProfessionalDash = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  return (
    <div className="professional-dash container py-4">
      <h2>Panel del Profesional</h2>
      <UserInfoCard user={user} />
      <p className="mt-3">Usa el menú lateral para validar estudiantes o revisar expedientes.</p>
    </div>
  );
};

export default ProfessionalDash;
