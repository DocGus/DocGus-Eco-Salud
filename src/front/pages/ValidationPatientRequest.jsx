import React, { useEffect, useState } from 'react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ValidationPatientRequest = () => {
  const [patientRequests, setPatientRequests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${backendUrl}/api/student/patient_requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setPatientRequests(data);
      } catch (err) {
        setError('Error al cargar las solicitudes.');
      }
    };

    fetchRequests();
  }, []);

  const handlePatientAction = async (patientId, action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/student/validate_patient/${patientId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error('Error procesando solicitud');

      if (action === 'approve') {
        const updatedRequests = patientRequests.map((p) =>
          p.id === patientId ? { ...p, file_status: 'progress' } : p
        );
        setPatientRequests(updatedRequests);
      } else {
        const updatedRequests = patientRequests.filter((p) => p.id !== patientId);
        setPatientRequests(updatedRequests);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container py-4">
      <h2>Validar Solicitudes de Pacientes</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {patientRequests.length === 0 ? (
        <p>No hay solicitudes pendientes.</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {patientRequests.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.full_name}</td>
                <td>
                  {patient.file_status === 'progress' ? (
                    <button className="btn btn-info" disabled>
                      Aceptado
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handlePatientAction(patient.id, 'approve')}
                        className="btn btn-success me-2"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handlePatientAction(patient.id, 'reject')}
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
    </div>
  );
};

export default ValidationPatientRequest;
