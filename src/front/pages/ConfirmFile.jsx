import React, { useEffect, useState } from "react";

// Pantalla para pacientes: confirmar o solicitar cambios al expediente aprobado.
// Endpoints:
// - GET  /api/private                         -> obtiene usuario autenticado y su medical_file_id
// - GET  /api/medical_file/:id                -> estado actual del expediente
// - GET  /api/patient/snapshots/:id           -> snapshots visibles al paciente
// - PUT  /api/patient/confirm_file/:id        -> { action: "confirm"|"reject", comment?: string }

const backendUrl = import.meta.env.VITE_BACKEND_URL; // Base de API desde variables Vite

const ConfirmFile = () => {
  const [fileStatus, setFileStatus] = useState(""); // approved | confirmed | otros
  const [medicalFileId, setMedicalFileId] = useState(null); // id del expediente del paciente
  const [snapshots, setSnapshots] = useState([]); // snapshots para confirmación visual
  const [comment, setComment] = useState(""); // comentario opcional al rechazar
  const [error, setError] = useState(null); // error general de carga o permisos

  useEffect(() => {
    const fetchFileStatus = async () => {
      // Carga el expediente del usuario autenticado y sus snapshots
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${backendUrl}/api/private`, {
          headers: { Authorization: `Bearer ${token}` }        });
        const data = await res.json();

        if (data?.user?.medical_file_id) {
          const fileId = data.user.medical_file_id;
          setMedicalFileId(fileId);

          const fileRes = await fetch(`${backendUrl}/api/medical_file/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const fileData = await fileRes.json();
          setFileStatus(fileData.medical_file.file_status);

          const snapRes = await fetch(`${backendUrl}/api/patient/snapshots/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const snapData = await snapRes.json();
          setSnapshots(snapData);
        } else {
          setError("No tienes expediente asignado.");
        }
      } catch (err) {
        // Report error to state for the UI and avoid direct console output in production
        setError("Error al cargar expediente.");
      }
    };

    fetchFileStatus();
  }, []);

  const handleAction = async (action) => {
    // Permite al paciente confirmar o solicitar cambios sobre el expediente
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/patient/confirm_file/${medicalFileId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, comment })
      });

      if (!res.ok) throw new Error("Error en la acción.");
      const result = await res.json();
      if (result?.file_status) setFileStatus(result.file_status);
      // Refrescar estado desde el backend para confirmar persistencia
      try {
        const token = localStorage.getItem("token");
        const fileRes = await fetch(`${backendUrl}/api/medical_file/${medicalFileId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          setFileStatus(fileData.medical_file.file_status);
        }
      } catch (e) {
        // noop: si falla el refresh, nos quedamos con el valor devuelto por el PUT
      }
      alert(`Expediente ${action === "confirm" ? "confirmado" : "rechazado"} correctamente.`);
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

          {(fileStatus === "approved" || fileStatus === "confirmed") && snapshots?.length > 0 && (
            <>
              {/* Muestra la primera snapshot como vista previa; fallback si no carga */}
              <div className="mb-3">
                <img
                  src={snapshots?.[0]?.url}
                  alt="snapshot"
                  loading="lazy"
                  style={{ maxWidth: '100%', maxHeight: 400 }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${backendUrl}/assets/preview.png`; }}
                />
              </div>

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
              {/* (extra image removed - kept single preview above) */}
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
