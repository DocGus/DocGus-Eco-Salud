import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ProfessionalDash = () => {
  const [user, setUser] = useState(null);
  const [studentRequests, setStudentRequests] = useState([]);
  const [reviewFiles, setReviewFiles] = useState([]);
  const [comments, setComments] = useState({}); // 🔥 Individual por expediente

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);

    const fetchStudentRequests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/professional/student_requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Error cargando solicitudes de estudiantes");
        const data = await res.json();
        setStudentRequests(data);
      } catch (error) {
        console.error(error);
      }
    };

    const fetchReviewFiles = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/professional/review_files`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Error cargando expedientes en revisión");
        const data = await res.json();
        setReviewFiles(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchStudentRequests();
    fetchReviewFiles();
  }, []);

  const handleStudentAction = async (studentId, action) => {
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
      if (!res.ok) throw new Error("Error procesando solicitud");
      alert(`Estudiante ${action} exitosamente.`);

      if (action === "approve") {
        setStudentRequests((prev) =>
          prev.map((student) =>
            student.id === studentId ? { ...student, status: "approved" } : student
          )
        );
      } else if (action === "reject") {
        setStudentRequests((prev) => prev.filter((student) => student.id !== studentId));
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReviewAction = async (fileId, action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/professional/review_file/${fileId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, comment: comments[fileId] || "" }),
      });
      if (!res.ok) throw new Error("Error procesando expediente");
      alert(`Expediente ${action} correctamente.`);
      setReviewFiles((prev) => prev.filter((file) => file.id !== fileId));

      // Limpiar comentario individual
      setComments((prev) => ({ ...prev, [fileId]: "" }));
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="professional-dash container py-4">
      <h2>Panel del Profesional</h2>
      <UserInfoCard user={user} />
      

      {/* ---------------------- SECCIÓN A: Solicitudes de estudiantes ---------------------- */}
      <h4>Solicitudes de estudiantes para validación</h4>
      {studentRequests.length === 0 ? (
        <p>No hay solicitudes pendientes.</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Carrera</th>
              <th>Grado académico</th>
              <th>Solicitado en</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {studentRequests.map((student) => (
              <tr key={student.id}>
                <td>{student.full_name}</td>
                <td>{student.email}</td>
                <td>{student.career}</td>
                <td>{student.academic_grade}</td>
                <td>{student.requested_at ? new Date(student.requested_at).toLocaleString() : "N/A"}</td>
                <td>
                  {student.status === "approved" ? (
                    <button className="btn btn-success" disabled>
                      Aprobado
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStudentAction(student.id, "approve")}
                        className="btn btn-success me-2"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleStudentAction(student.id, "reject")}
                        className="btn btn-danger"
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

      <hr />

      {/* ---------------------- SECCIÓN B: Expedientes en revisión ---------------------- */}
      <h4>Expedientes en revisión (solo tus estudiantes aprobados)</h4>
      {reviewFiles.length === 0 ? (
        <p>No hay expedientes pendientes de revisión.</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <th>ID Expediente</th>
              <th>Paciente</th>
              <th>Estudiante</th>
              <th>Snapshot</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reviewFiles.map((file) => (
              <tr key={file.id}>
                <td>{file.id}</td>
                <td>{file.patient_name}</td>
                <td>{file.student_name}</td>
                <td>
                  {file.snapshots && file.snapshots.length > 0 ? (
                    <a
                      href={file.snapshots[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-info"
                    >
                      Ver snapshot
                    </a>
                  ) : (
                    <span>No snapshot</span>
                  )}
                </td>
                <td>
                  <textarea
                    placeholder="Comentario (opcional)"
                    value={comments[file.id] || ""}
                    onChange={(e) => setComments({ ...comments, [file.id]: e.target.value })}
                    className="form-control mb-2"
                  />
                  <button
                    onClick={() => handleReviewAction(file.id, "approve")}
                    className="btn btn-success me-2"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReviewAction(file.id, "reject")}
                    className="btn btn-danger"
                  >
                    Regresar a progreso
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProfessionalDash;
