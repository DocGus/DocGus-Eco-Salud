import React, { useEffect, useState } from "react";
import UserInfoCard from "../components/UserInfoCard";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const PatientDash = () => {
  const [user, setUser] = useState(null);
  const [medicalFile, setMedicalFile] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [fileStatus, setFileStatus] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/private`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUser(data.user);

        if (data.user.medical_file_id) {
          const fileRes = await fetch(`${backendUrl}/api/medical_file/${data.user.medical_file_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            setMedicalFile(fileData.medical_file);
            setFileStatus(fileData.medical_file.file_status);
          }

          const snapRes = await fetch(`${backendUrl}/api/patient/snapshots/${data.user.medical_file_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (snapRes.ok) {
            const snapData = await snapRes.json();
            setSnapshots(snapData);
          }
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };

    fetchData();
  }, []);

  const handleRequestStudent = async () => {
    if (!studentId) {
      alert("Debes ingresar el ID del estudiante");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/patient/request_student_validation/${studentId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error solicitando estudiante");

      alert("Solicitud enviada correctamente");
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAction = async (actionType) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/patient/confirm_file/${medicalFile.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: actionType, comment }),
      });

      if (!res.ok) throw new Error("Error al enviar acción");
      alert(`Expediente ${actionType} correctamente.`);
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  };

  // ---------- Leyenda para expediente ----------
  const expedienteMessage = () => {
    if (fileStatus === "confirmed") {
      return "✅ Su expediente ha quedado confirmado y guardado.";
    } else if (fileStatus === "approved") {
      return "⌛ Su expediente está en proceso. Esperando confirmación final.";
    }
    return null;
  };

  return (
    <div className="patient-dash">
      <UserInfoCard user={user} />
      <h2>Mi Dashboard (Paciente)</h2>
      <p>Status expediente: {fileStatus}</p>

      {medicalFile?.selected_student_id ? (
        <>
          <p>✅ Estudiante asignado. No puedes enviar nuevas solicitudes.</p>
          {expedienteMessage() && <p>{expedienteMessage()}</p>}
        </>
      ) : medicalFile?.patient_requested_student_id ? (
        <p>⌛ Solicitud enviada. En espera de aprobación por el estudiante seleccionado.</p>
      ) : (
        <div className="mt-3">
          <h4>Solicitar estudiante</h4>
          <input
            type="number"
            placeholder="ID del estudiante"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="form-control mb-2"
          />
          <button
            onClick={handleRequestStudent}
            className="btn btn-primary"
          >
            Enviar solicitud
          </button>
        </div>
      )}

      <div className="mt-4">
        <h4>Expediente</h4>
        {(fileStatus === "approved" || fileStatus === "confirmed") && snapshots.length > 0 ? (
          <>
            <a
              href={snapshots[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-info"
            >
              Ver snapshot
            </a>

            {fileStatus === "approved" && (
              <>
                <button
                  onClick={() => handleAction("confirm")}
                  className="btn btn-success mt-2 me-2"
                >
                  Confirmar
                </button>
                <div className="mt-3">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comentarios para solicitar cambios (opcional)"
                    className="form-control mb-2"
                  />
                  <button
                    onClick={() => handleAction("reject")}
                    className="btn btn-danger"
                  >
                    Solicitar cambios
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <p>No tienes expediente revisado aún.</p>
        )}
      </div>
    </div>
  );
};

export default PatientDash;
