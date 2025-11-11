import React, { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import { useParams } from "react-router-dom";

// Pantalla para que el estudiante llene antecedentes de un paciente y envíe a revisión.
// Flujo: carga expediente -> completa formulario -> guarda antecedentes -> genera snapshot -> envía a revisión.

const initialState = {
  // Estructura base usada para inicializar y limpiar el formulario.
  patological_background: {
    personal_diseases: "",
    medications: "",
    hospitalizations: "",
    surgeries: "",
    traumatisms: "",
    transfusions: "",
    allergies: "",
    others: "",
  },
  family_background: {
    hypertension: false,
    diabetes: false,
    cancer: false,
    heart_disease: false,
    kidney_disease: false,
    liver_disease: false,
    mental_illness: false,
    congenital_malformations: false,
    others: "",
  },
  non_pathological_background: {
    sex: "",
    nationality: "",
    ethnic_group: "",
    languages: "",
    blood_type: "",
    spiritual_practices: "",
    other_origin_info: "",
    address: "",
    housing_type: "",
    civil_status: "",
    cohabitants: "",
    dependents: "",
    other_living_info: "",
    education_level: "",
    economic_activity: "",
    marital_status: "",
    occupation: "",
    recent_travels: "",
    social_activities: "",
    exercise: "",
    diet_supplements: "",
    hygiene: "",
    tattoos: false,
    piercings: false,
    hobbies: "",
    tobacco_use: "",
    alcohol_use: "",
    recreational_drugs: "",
    addictions: "",
    others: "",
  },
  gynecological_background: {
    menarche_age: "",
    pregnancies: "",
    births: "",
    c_sections: "",
    abortions: "",
    contraceptive_method: "",
    others: "",
  },
};

// Normaliza valores entrantes (del backend) contra un objeto de defaults.
// - Conserva tipos (booleans) y evita undefined usando strings vacíos.
const normalize = (data, defaults) => {
  const copy = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    const val = data[key];
    if (typeof defaults[key] === "boolean") {
      copy[key] = val === true;
    } else {
      copy[key] = val ?? "";
    }
  });
  return copy;
};

// Orden configurable para los campos de "Antecedentes No Patológicos".
// Nota: Por defecto usamos el orden actual. Para reordenar, basta con cambiar
// el arreglo NP_FIELDS_ORDER sin añadir ni quitar claves existentes.
const NP_FIELDS_ORDER_DEFAULT = Object.keys(initialState.non_pathological_background);
const NP_FIELDS_ORDER = [
  ...NP_FIELDS_ORDER_DEFAULT,
  // Ejemplo de reordenamiento futuro:
  // "marital_status", "civil_status", "education_level", ...
];

// Renderizador de la sección No Patológica con orden controlado por NP_FIELDS_ORDER
const NonPathologicalSection = ({ values, onChange }) => {
  return (
    <>
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes No Patológicos</h4>
      {NP_FIELDS_ORDER.map((field) => (
        <div key={field} className="mb-2 col-6">
          <label className="block">{field.replace(/_/g, " ")}</label>
          {typeof initialState.non_pathological_background[field] === "boolean" ? (
            <input
              type="checkbox"
              name={field}
              checked={values[field]}
              onChange={onChange}
            />
          ) : (
            <textarea
              name={field}
              value={values[field]}
              onChange={onChange}
              className="form-control"
            />
          )}
        </div>
      ))}
    </>
  );
};

const BackGroundInterview = () => {
  const { medicalFileId } = useParams(); // ID del expediente recibido por URL.
  const [form, setForm] = useState(initialState); // Estado único con todas las secciones.
  const [sentToReview, setSentToReview] = useState(false); // Flag para UX tras enviar a revisión.

  // Maneja cambios de campos del formulario agrupados por sección.
  const handleChange = (e, section) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: val,
      },
    }));
  };

  // Envío principal: guarda antecedentes y sube snapshot; deja expediente en "review".
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("No hay token. Inicia sesión nuevamente.");
      return;
    }

    // Cuerpo enviado al backend para persistir antecedentes en la historia clínica.
    const newFormData = {
      ...form,
      medical_file_id: medicalFileId,
    };

    try {
      // 1) Persistir antecedentes en el backend
      // Endpoint: POST /api/backgrounds (requiere JWT)
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/backgrounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newFormData),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Error en antecedentes:", data);
        alert(`Error: ${data.error || data.message}`);
        return;
      }

      // 2) Generar snapshot visual del formulario usando html2canvas
      const element = document.querySelector("form");
      const canvas = await html2canvas(element);
      const dataUrl = canvas.toDataURL("image/png"); // Data URL base64 (PNG)

      // 3) Subir snapshot para dejar constancia y permitir revisión visual
      // Endpoint: POST /api/upload_snapshot/:medicalFileId (rol: student)
      const snapshotRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload_snapshot/${medicalFileId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ snapshot_url: dataUrl }),
      });

      if (!snapshotRes.ok) {
        const snapshotData = await snapshotRes.json();
        console.error("Error al subir snapshot:", snapshotData);
        alert(`Error al subir snapshot: ${snapshotData.error}`);
        return;
      }

      // UX: feedback positivo y reseteo del formulario
      alert("Antecedentes guardados y expediente enviado a revisión ✅");
      setSentToReview(true);
      setForm(initialState);

    } catch (err) {
      console.error("Error de conexión:", err);
      alert("Error de conexión con el servidor.");
    }
  };

  // Carga inicial del expediente para prellenar campos con valores existentes.
  useEffect(() => {
    const fetchMedicalFile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/medical_file/${medicalFileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          console.error("Error al cargar expediente:", data);
          return;
        }

        // Crear una copia limpia del estado inicial y normalizar por sección.
        const newForm = { ...initialState };

        if (data.medical_file.non_pathological_background) {
          newForm.non_pathological_background = normalize(data.medical_file.non_pathological_background, initialState.non_pathological_background);
        }
        if (data.medical_file.pathological_background) {
          newForm.patological_background = normalize(data.medical_file.pathological_background, initialState.patological_background);
        }
        if (data.medical_file.family_background) {
          newForm.family_background = normalize(data.medical_file.family_background, initialState.family_background);
        }
        if (data.medical_file.gynecological_background) {
          newForm.gynecological_background = normalize(data.medical_file.gynecological_background, initialState.gynecological_background);
        }

        setForm(newForm);

        // Si ya está en revisión o aprobado/confirmado, reflejarlo en UI.
        if (["review", "approved", "confirmed"].includes(data.medical_file.file_status)) {
          setSentToReview(true);
        }
      } catch (error) {
        console.error("Error al cargar expediente:", error);
      }
    };

    fetchMedicalFile();
  }, [medicalFileId]);

  // Si ya se envió a revisión, mostrar aviso y evitar reenvíos.
  if (sentToReview) {
    return <p>✅ Expediente enviado a revisión. Esperando respuesta del profesional.</p>;
  }

  // Render del formulario: campos agrupados por categorías clínicas.
  return (
    <form onSubmit={handleSubmit} className="row p-4 rounded shadow-md max-w-5xl mx-auto" data-bs-theme="dark">
      <h2 className="text-2xl font-bold mb-4">Antecedentes Médicos del Paciente</h2>

      {/* ----------------- NO PATOLÓGICOS ----------------- */}
      <NonPathologicalSection
        values={form.non_pathological_background}
        onChange={(e) => handleChange(e, "non_pathological_background")}
      />

      {/* ----------------- PATOLÓGICOS ----------------- */}
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes Patológicos</h4>
      {Object.keys(initialState.patological_background).map((field) => (
        <div key={field} className="mb-2 col-6">
          <label className="block">{field.replace(/_/g, " ")}</label>
          <textarea
            name={field}
            value={form.patological_background[field]}
            onChange={(e) => handleChange(e, "patological_background")}
            className="form-control"
          />
        </div>
      ))}

      {/* ----------------- FAMILIARES ----------------- */}
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes Familiares</h4>
      {Object.keys(initialState.family_background).map((field) => (
        <div key={field} className="mb-2 col-6">
          <label className="block">{field.replace(/_/g, " ")}</label>
          {typeof initialState.family_background[field] === "boolean" ? (
            <input
              type="checkbox"
              name={field}
              checked={form.family_background[field]}
              onChange={(e) => handleChange(e, "family_background")}
            />
          ) : (
            <textarea
              name={field}
              value={form.family_background[field]}
              onChange={(e) => handleChange(e, "family_background")}
              className="form-control"
            />
          )}
        </div>
      ))}

      {/* ----------------- GINECOLÓGICOS ----------------- */}
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes Ginecológicos</h4>
      {Object.keys(initialState.gynecological_background).map((field) => (
        <div key={field} className="mb-2 col-6">
          <label className="block">{field.replace(/_/g, " ")}</label>
          <input
            type="text"
            name={field}
            value={form.gynecological_background[field]}
            onChange={(e) => handleChange(e, "gynecological_background")}
            className="form-control"
          />
        </div>
      ))}

      <div className="mt-4 col-12">
        <button type="submit" className="btn btn-primary me-2">Guardar y enviar a revisión</button>
        <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>Cancelar</button>
      </div>
    </form>
  );
};

export default BackGroundInterview;
