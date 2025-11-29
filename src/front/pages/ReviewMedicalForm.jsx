import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackgroundForm from "../components/BackgroundForm";

const ReviewMedicalForm = () => {
    const { medicalFileId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/medical_file/${medicalFileId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) {
                    console.error("Error cargando expediente:", data);
                    setFormData(null);
                } else {
                    // La ruta devuelve { medical_file: { ... } }
                    setFormData(data.medical_file || null);
                }
            } catch (e) {
                console.error(e);
                setFormData(null);
            }
            setLoading(false);
        };
        fetchData();
    }, [medicalFileId]);

    const doReviewAction = async (action) => {
        if (!window.confirm(`Confirmar acción: ${action}`)) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/professional/review_file/${medicalFileId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action, comment: notes }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(`Error: ${data.error || data.message || 'Error desconocido'}`);
            } else {
                alert(data.message || "Acción realizada");
                navigate(-1);
            }
        } catch (err) {
            console.error(err);
            alert("Error en la solicitud");
        }
        setSubmitting(false);
    };

    if (loading) return <div className="container py-4">Cargando...</div>;
    if (!formData) return <div className="container py-4">No se encontró el expediente.</div>;

    return (
        <div className="container py-4">
            <h2>Revisión de Formulario Médico</h2>
            <div className="mb-3">
                <label className="form-label">Notas del profesional</label>
                <textarea className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="mb-3 d-flex gap-2">
                <button className="btn btn-success" onClick={() => doReviewAction("approve")} disabled={submitting}>Aprobar</button>
                <button className="btn btn-danger" onClick={() => doReviewAction("reject")} disabled={submitting}>Devolver</button>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Volver</button>
            </div>

            <BackgroundForm readOnly initialData={formData} />
        </div>
    );
};

export default ReviewMedicalForm;
