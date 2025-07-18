import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const StudentPatientProgress = () => {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignedPatients = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/student/assigned_patients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAssignedPatients(data);
      } catch (err) {
        setError("Error al cargar los pacientes asignados.");
      }
    };

    fetchAssignedPatients();
  }, []);

  const goToInterview = (medicalFileId) => {
    navigate(`/dashboard/student/interview/${medicalFileId}`);
  };

  return (
    <div className="container py-4">
      <h2>Pacientes Asignados</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {assignedPatients.length === 0 ? (
        <p>No tienes pacientes asignados aún.</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Estado expediente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {assignedPatients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.full_name}</td>
                <td>{patient.file_status}</td>
                <td>
                  {patient.file_status === "progress" ? (
                    <button
                      onClick={() => goToInterview(patient.medicalFileId)}
                      className="btn btn-primary"
                    >
                      Ver entrevista
                    </button>
                  ) : patient.file_status === "completed" || patient.file_status === "submitted" ? (
                    <button className="btn btn-info" disabled>
                      En revisión
                    </button>
                  ) : patient.file_status === "authorized" ? (
                    <button className="btn btn-success" disabled>
                      Autorizado
                    </button>
                  ) : patient.file_status === "rejected" ? (
                    <button className="btn btn-danger" disabled>
                      Rechazado
                    </button>
                  ) : (
                    <span>—</span>
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

export default StudentPatientProgress;
