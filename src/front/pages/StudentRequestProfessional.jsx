import React, { useState } from 'react';

const StudentRequestProfessional = () => {
  const [professionalId, setProfessionalId] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

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
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar la solicitud.');
      } else {
        setMessage('Solicitud enviada exitosamente al profesional.');
        setProfessionalId('');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    }
  };

  return (
    <div>
      <h2>Solicitar aprobación de un profesional</h2>
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

      {message && <div className="alert alert-success mt-3">{message}</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
    </div>
  );
};

export default StudentRequestProfessional;
