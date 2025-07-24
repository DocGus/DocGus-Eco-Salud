import React, { useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ConfirmFile = () => {
  const [fileStatus, setFileStatus] = useState("");
  const [medicalFileId, setMedicalFileId] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFileStatus = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${backendUrl}/api/private`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data?.user?.medical_file_id) {
          const fileId = data.user.medical_file_id;
          setMedicalFileId(fileId);

          const fileRes = await fetch(`${backendUrl}/api/medical_file/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const fileData = await fileRes.json();
          setFileStatus(fileData.medical_file.file_status);

          const snapRes = await fetch(`${backendUrl}/api/patient/snapshots/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const snapData = await snapRes.json();
          setSnapshots(snapData);
        } else {
          setError("No tienes expediente asignado.");
        }
      } catch (err) {
        console.error("Error al cargar expediente:", err);
        setError("Error al cargar expediente.");
      }
    };

    fetchFileStatus();
  }, []);

  const handleAction = async (action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/patient/confirm_file/${medicalFileId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, comment }),
      });

      if (!res.ok) throw new Error("Error en la acción.");
      alert(`Expediente ${action === "confirm" ? "confirmado" : "rechazado"} correctamente.`);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h3>Estado de Expediente</h3>
      {error && <p className="text-danger">{error}</p>}
      {!error && (
        <>
          <p><strong>Status:</strong> {fileStatus}</p>

          {(fileStatus === "approved" || fileStatus === "confirmed") && snapshots.length > 0 && (
            <>
              <a
                href={snapshots[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-info mb-3"
              >
                Ver Snapshot
              </a>

              {fileStatus === "approved" && (
                <div>
                  <button
                    onClick={() => handleAction("confirm")}
                    className="btn btn-success me-2"
                  >
                    Confirmar
                  </button>
                  <textarea
                    className="form-control my-2"
                    placeholder="Comentarios para solicitar cambios (opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    onClick={() => handleAction("reject")}
                    className="btn btn-danger"
                  >
                    Solicitar cambios
                  </button>
                </div>
              )}
            </>
          )}

          {fileStatus !== "approved" && fileStatus !== "confirmed" && (
            <p>No hay expediente aprobado aún.</p>
          )}
        </>
      )}
    </div>
  );
};

export default ConfirmFile;
