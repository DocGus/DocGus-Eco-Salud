import React, { useState, useEffect } from 'react';

const StudentRequestProfessional = () => {
  const [professionalId, setProfessionalId] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); // 'requested' | null
  const [requestedProfessionalId, setRequestedProfessionalId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Obtener estado actual al cargar
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/student/professional_request_status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Error al obtener el estado de la solicitud.');
        const data = await res.json();
        if (data.status === 'requested') {
          setRequestStatus('requested');
          setRequestedProfessionalId(data.professional_id);
        }
      } catch (err) {
        setError('Error al obtener el estado de la solicitud.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // ✅ Enviar solicitud
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!professionalId) {
      setError('Por favor ingresa un ID válido de profesional.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/request_student_validation/${professionalId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar la solicitud.');
      } else {
        setRequestedProfessionalId(professionalId);
        setRequestStatus('requested');
        setProfessionalId('');
        setMessage(`Solicitud enviada al profesional con ID: ${professionalId}`);
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    }
  };

  // ❌ Cancelar solicitud
  const handleCancelRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/student/cancel_professional_request`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('No se pudo cancelar la solicitud');
      setRequestStatus(null);
      setRequestedProfessionalId(null);
      setMessage('Solicitud cancelada correctamente.');
    } catch (err) {
      setError('Error al cancelar la solicitud.');
    }
  };

  if (loading) {
    return <div className="alert alert-secondary">Cargando estado de la solicitud...</div>;
  }

  return (
    <div>
      <h2>Solicitar aprobación de un profesional</h2>

      {requestStatus !== 'requested' ? (
        <>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="professionalId" className="form-label">ID del Profesional</label>
              <input
                type="number"
                id="professionalId"
                className="form-control"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                required
                min="1"
              />
            </div>
            <button type="submit" className="btn btn-primary">Enviar solicitud</button>
          </form>

          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {message && <div className="alert alert-success mt-3">{message}</div>}
        </>
      ) : (
        <div className="alert alert-info mt-3">
          Solicitud activa al profesional con ID: <strong>{requestedProfessionalId}</strong>.<br />
          Esperando aprobación.
          <br />
          <button className="btn btn-warning mt-3" onClick={handleCancelRequest}>
            Cancelar solicitud
          </button>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {message && <div className="alert alert-success mt-3">{message}</div>}
        </div>
      )}
    </div>
  );
};

export default StudentRequestProfessional;
