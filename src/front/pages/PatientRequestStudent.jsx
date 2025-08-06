import React, { useState, useEffect } from 'react';

const PatientRequestStudent = () => {
  const [studentId, setStudentId] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestedStudentId, setRequestedStudentId] = useState(null);
  const [professionalId, setProfessionalId] = useState(null);
  const [loading, setLoading] = useState(true); // Nuevo estado para controlar carga

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/patient/student_request_status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Error al obtener el estado de la solicitud.');
        const data = await res.json();
        if (data.status === 'requested') {
          setRequestStatus('requested');
          setRequestedStudentId(data.student_id);
          setProfessionalId(data.professional_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false); // Se termina la carga
      }
    };

    fetchStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!studentId) {
      setError('Por favor ingresa un ID válido de estudiante.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/patient/request_student_validation/${studentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar la solicitud.');
      } else {
        setRequestedStudentId(studentId);
        setRequestStatus('requested');
        setStudentId('');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    }
  };

  const handleCancelRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/patient/cancel_student_request`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('No se pudo cancelar la solicitud');
      setRequestStatus(null);
      setRequestedStudentId(null);
      setMessage('Solicitud cancelada.');
    } catch (err) {
      setError('Error al cancelar la solicitud.');
    }
  };

  // 🔄 Mientras se obtiene el estado, muestra cargando
  if (loading) {
    return <div className="alert alert-secondary">Cargando estado de la solicitud...</div>;
  }

  return (
    <div>
      <h2>Solicitar estudiante para llenar expediente</h2>

      {requestStatus !== 'requested' ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="studentId" className="form-label">ID del Estudiante</label>
            <input
              type="number"
              id="studentId"
              className="form-control"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              min="1"
            />
          </div>
          <button type="submit" className="btn btn-primary">Enviar solicitud</button>

          {error && <div className="alert alert-danger mt-3">{error}</div>}
        </form>
      ) : (
        <div className="alert alert-info mt-3">
          Solicitud activa al estudiante con ID: <strong>{requestedStudentId}</strong>.<br />
          A la espera de aprobación del profesional (ID: <strong>{professionalId}</strong>).
          <br />
          <button className="btn btn-warning mt-3" onClick={handleCancelRequest}>
            Cancelar solicitud
          </button>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {message && <div className="alert alert-success mt-3">{message}</div>}
        </div>
      )}

      {message && requestStatus !== 'requested' && (
        <div className="alert alert-success mt-3">{message}</div>
      )}
    </div>
  );
};

export default PatientRequestStudent;
