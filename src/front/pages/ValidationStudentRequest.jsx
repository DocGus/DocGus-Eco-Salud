import React, { useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ValidationStudentRequest = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/professional/student_requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al cargar las solicitudes.");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleValidation = async (studentId, action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/professional/validate_student/${studentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error("Error procesando validación.");

      if (action === "approve") {
        setRequests(prev =>
          prev.map(student =>
            student.id === studentId ? { ...student, status: "approved" } : student
          )
        );
      } else {
        setRequests(prev => prev.filter(student => student.id !== studentId));
      }
    } catch (err) {
      alert("Error al validar estudiante: " + err.message);
    }
  };

  return (
    <div className="container py-4">
      <h2>Validación de Estudiantes</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {requests.length === 0 ? (
        <p>No hay solicitudes pendientes.</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((student) => (
              <tr key={student.id}>
                <td>{student.full_name}</td>
                <td>{student.email}</td>
                <td>
                  {student.status === "approved" ? (
                    <button className="btn btn-success" disabled>
                      Aprobado
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-success me-2"
                        onClick={() => handleValidation(student.id, "approve")}
                      >
                        Aprobar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleValidation(student.id, "reject")}
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ValidationStudentRequest;
