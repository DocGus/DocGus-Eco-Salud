import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const StudentDash = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  return (
    <div className="student-dash container py-4">
      <h2>Panel del Estudiante</h2>
      <UserInfoCard user={user} />
      <p className="mt-3">Usa el menú lateral para acceder a tus funciones.</p>
    </div>
  );
};

export default StudentDash;
