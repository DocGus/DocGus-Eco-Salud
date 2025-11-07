import React, { useEffect, useState } from "react";

// Pantalla para profesionales: revisar expedientes enviados por estudiantes.
// Endpoints:
// - GET  /api/professional/review_files           -> lista expedientes en estado "review" con metadatos + snapshots
// - PUT  /api/professional/review_file/:id        -> { action: "approve"|"reject", comment?: string }
// Flujo: cargar lista -> opcionalmente comentar -> aprobar o regresar a progreso.

const backendUrl = import.meta.env.VITE_BACKEND_URL; // Base del backend definida por Vite

const StudentFilesReview = () => {
  const [reviewFiles, setReviewFiles] = useState([]); // Lista de expedientes a revisar
  const [comments, setComments] = useState({}); // Comentarios por expediente: { [fileId]: string }
  const [error, setError] = useState(null); // Mensaje de error general de la pantalla

  useEffect(() => {
    const fetchReviewFiles = async () => {
      // Carga inicial de expedientes pendientes de revisión (rol: professional)
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendUrl}/api/professional/review_files`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Error al cargar los expedientes.");
        const data = await res.json();
        setReviewFiles(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchReviewFiles();
  }, []);

  const handleReviewAction = async (fileId, action) => {
    // Envía decisión de revisión: "approve" o "reject" y un comentario opcional
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/professional/review_file/${fileId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, comment: comments[fileId] || "" })
      });

      if (!res.ok) throw new Error("Error procesando expediente");
      alert(`Expediente ${action} correctamente.`);
      // Optimismo: sacamos el expediente de la lista local al completar
      setReviewFiles((prev) => prev.filter((file) => file.id !== fileId));
      setComments((prev) => ({ ...prev, [fileId]: "" }));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="container py-4">
      <h2>Revisión de Expedientes Enviados por Estudiantes</h2>
      {error && <div className="alert alert-danger">{error}</div>}
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
                    <a href={file.snapshots?.[0]?.url || '#'} target="_blank" rel="noreferrer">
                      {file.snapshots?.[0] ? (
                        <img
                          src={file.snapshots?.[0]?.url}
                          alt={`snapshot-${file.id}`}
                          loading="lazy"
                          style={{ width: 80, height: 80, objectFit: 'cover' }}
                          // Fallback visual si la imagen no carga: muestra miniatura por defecto
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${backendUrl}/assets/preview.png`; }}
                        />
                      ) : 'Ver'}
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

export default StudentFilesReview;
