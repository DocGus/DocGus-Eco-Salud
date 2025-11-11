import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import html2canvas from "html2canvas";
import SelectOrOther from "./SelectOrOther";
import MultiSelectOrOther from "./MultiSelectOrOther";

const initialState = {
  patological_background: {
    personal_diseases: "",
    medications: "",
    hospitalizations: "",
    surgeries: "",
    traumatisms: "",
    transfusions: "",
    allergies: "",
    others: ""
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
    others: ""
  },
  non_pathological_background: {
    // Identidad biológica
    sex: "",
    blood_type: "",
    ethnic_group: "",
    // Info del usuario (solo visual): birth_day vendrá del backend en data.user
    // Identidad geográfica - Origen
    birth_country: "",
    birth_state: "",
    birth_city: "",
    birth_neighborhood: "",
    birth_street: "",
    birth_ext_int: "",
    birth_zip: "",
    birth_other_info: "",
    // Identidad geográfica - Residencia actual
    residence_country: "",
    residence_state: "",
    residence_city: "",
    residence_neighborhood: "",
    residence_street: "",
    residence_ext_int: "",
    residence_zip: "",
    residence_other_info: "",
    // Identidad política social y económica
    nationality: "México",
    languages: "",
    education_level: "",
    education_details: "",
    economic_activity: "",
    economic_activities: [
      { employment_type: "", sector: "", role: "", days_per_week: "" }
    ],
    civil_status: "",
    housing_type: "",
    cohabitants: "",
    religions: "",
    dependents: "",
    // Prácticas culturales y sociales / hobbies
    social_volunteer: false,
    social_sports_club: false,
    social_cultural_events: false,
    social_family_friends: false,
    hobbies: "",
    social_activities: "", // Nota adicional consolidada
    // Prácticas espirituales / religiosas
    spiritual_practice_type: "",
    spiritual_frequency: "",
    spiritual_community: "",
    spiritual_meaning: "",
    spiritual_practices: "", // Nota adicional consolidada
    // Viajes recientes
    recent_travel_place: "",
    recent_travel_date: "",
    recent_travel_duration: "",
    recent_travel_reason: "",
    recent_travels: "", // Nota adicional consolidada
    // Estilo de vida - Actividad física
    exercise_type: "",
    exercise_days_per_week: "",
    exercise_hours_per_week: "",
    exercise_focus: "",
    exercise: "", // Nota adicional consolidada
    exercise_activities: [
      { type: "", days_per_week: "", hours_per_week: "", focus: "", note: "" }
    ],
    // Hábitos y cuidados personales
    hygiene: "",
    tattoos: false,
    piercings: false,
    tattoo_locations: "",
    piercing_locations: "",
    // Consumos estructurados
    consume_tobacco: false,
    tobacco_frequency: "",
    tobacco_days_per_week: "",
    tobacco_quantity: "",
    consume_alcohol: false,
    alcohol_frequency: "",
    alcohol_days_per_week: "",
    alcohol_type: "",
    alcohol_quantity: "",
    consume_recreational_drugs: false,
    recreational_drugs_frequency: "",
    recreational_drugs_days_per_week: "",
    recreational_drug_type: "",
    recreational_drugs_quantity: "",
    tobacco_use: "",
    alcohol_use: "",
    recreational_drugs: "",
    addictions: "",
    others: "",
    // Antecedentes nutricionales
    meals_per_day: "",
    diet_supplements: "",
    favorite_foods: "",
    foods_to_avoid: "",
    // Compatibilidad con campos previos
    address: "",
    other_origin_info: "",
    other_living_info: "",
    marital_status: "",
    occupation: ""
  },
  gynecological_background: {
    menarche_age: "",
    pregnancies: "",
    births: "",
    c_sections: "",
    abortions: "",
    contraceptive_method: "",
    others: ""
  }
};

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

const BackgroundForm = ({ medicalFileId }) => {
  const [form, setForm] = useState(initialState);
  const [userInfo, setUserInfo] = useState({ birth_day: "" });

  const COUNTRIES = [
    "México",
    "Argentina",
    "Bolivia",
    "Brasil",
    "Chile",
    "Colombia",
    "Costa Rica",
    "Cuba",
    "Ecuador",
    "El Salvador",
    "España",
    "Estados Unidos",
    "Guatemala",
    "Honduras",
    "Nicaragua",
    "Panamá",
    "Paraguay",
    "Perú",
    "República Dominicana",
    "Uruguay",
    "Venezuela",
    "Canadá",
    "Italia",
    "Francia",
    "Alemania",
    "Reino Unido",
    "China",
    "Japón",
    "India",
    "Otro"
  ];
  const fieldOptions = {
    non_pathological_background: {
      sex: ["Femenino", "Masculino", "No binario"],
      blood_type: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Desconocido"],
      civil_status: ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Viudo(a)"],
      housing_type: ["Propia", "Rentada", "Con familiares"],
      education_level: ["Primaria", "Secundaria", "Preparatoria", "Técnica", "Licenciatura", "Posgrado"],
      exercise: ["Nunca", "1-2 veces/semana", "3-5 veces/semana", "Diario"],
      hygiene: ["Básica", "Buena", "Excelente"],
      tobacco_use: ["No", "Ocasional", "Regular", "Exfumador"],
      alcohol_use: ["No", "Ocasional", "Regular"],
      recreational_drugs: ["No", "Ocasional", "Regular", "En rehabilitación"]
    },
    gynecological_background: {
      contraceptive_method: ["Ninguno", "DIU", "Implante", "Pastillas", "Inyección", "Condón"]
    }
  };

  const handleChange = (e, section) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: val
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("No hay token. Por favor, inicia sesión nuevamente.");
      return;
    }

    // Transformar campos del bloque no patológico para que coincidan con el modelo backend
    const buildNonPathPayload = (np) => {
      const yesNo = (b) => (b ? "yes" : "no");

      // Consolidar ORIGEN
      const originParts = [];
      if (np.birth_country) originParts.push(`País: ${np.birth_country}`);
      if (np.birth_state) originParts.push(`Estado: ${np.birth_state}`);
      if (np.birth_city) originParts.push(`Ciudad: ${np.birth_city}`);
      if (np.birth_neighborhood) originParts.push(`Colonia: ${np.birth_neighborhood}`);
      if (np.birth_street) originParts.push(`Calle: ${np.birth_street}`);
      if (np.birth_ext_int) originParts.push(`No: ${np.birth_ext_int}`);
      if (np.birth_zip) originParts.push(`CP: ${np.birth_zip}`);
      if (np.birth_other_info) originParts.push(`Otros: ${np.birth_other_info}`);
      const originStr = originParts.join(" | ");

      // Consolidar RESIDENCIA en address + notas
      const addressParts = [];
      if (np.residence_street) addressParts.push(np.residence_street);
      if (np.residence_ext_int) addressParts.push(np.residence_ext_int);
      if (np.residence_neighborhood) addressParts.push(np.residence_neighborhood);
      if (np.residence_city) addressParts.push(np.residence_city);
      if (np.residence_state) addressParts.push(np.residence_state);
      if (np.residence_zip) addressParts.push(np.residence_zip);
      if (np.residence_country) addressParts.push(np.residence_country);
      const addressStr = addressParts.filter(Boolean).join(", ");

      // Consolidar prácticas espirituales
      const spiritualParts = [];
      if (np.spiritual_practice_type) spiritualParts.push(`Tipo: ${np.spiritual_practice_type}`);
      if (np.spiritual_frequency) spiritualParts.push(`Frecuencia: ${np.spiritual_frequency}`);
      if (np.spiritual_community) spiritualParts.push(`Comunidad: ${np.spiritual_community}`);
      if (np.spiritual_meaning) spiritualParts.push(`Significado: ${np.spiritual_meaning}`);
      if (np.spiritual_practices) spiritualParts.push(`Nota: ${np.spiritual_practices}`);
      const spiritualStr = spiritualParts.join(" | ");

      // Consolidar viajes recientes
      const travelParts = [];
      if (np.recent_travel_place) travelParts.push(`Lugar: ${np.recent_travel_place}`);
      if (np.recent_travel_date) travelParts.push(`Fecha: ${np.recent_travel_date}`);
      if (np.recent_travel_duration) travelParts.push(`Duración: ${np.recent_travel_duration}`);
      if (np.recent_travel_reason) travelParts.push(`Motivo: ${np.recent_travel_reason}`);
      if (np.recent_travels) travelParts.push(`Nota: ${np.recent_travels}`);
      const travelStr = travelParts.join(" | ");

      // Consolidar actividad física (múltiples actividades soportadas)
      let exerciseStr = "";
      if (Array.isArray(np.exercise_activities) && np.exercise_activities.length > 0) {
        const blocks = np.exercise_activities.map((a, i) => {
          const parts = [];
          if (a?.type) parts.push(`Tipo: ${a.type}`);
          if (a?.days_per_week !== undefined && a?.days_per_week !== "") parts.push(`Días/sem: ${a.days_per_week}`);
          if (a?.hours_per_week !== undefined && a?.hours_per_week !== "") parts.push(`Horas/sem: ${a.hours_per_week}`);
          if (a?.focus) parts.push(`Enfoque: ${a.focus}`);
          if (a?.note) parts.push(`Nota: ${a.note}`);
          return parts.length ? `${i + 1}) ${parts.join(" | ")}` : "";
        });
        exerciseStr = blocks.filter(Boolean).join("; ");
      } else {
        const exerciseParts = [];
        if (np.exercise_type) exerciseParts.push(`Tipo: ${np.exercise_type}`);
        if (np.exercise_days_per_week) exerciseParts.push(`Días/sem: ${np.exercise_days_per_week}`);
        if (np.exercise_hours_per_week) exerciseParts.push(`Horas/sem: ${np.exercise_hours_per_week}`);
        if (np.exercise_focus) exerciseParts.push(`Enfoque: ${np.exercise_focus}`);
        if (np.exercise) exerciseParts.push(`Nota: ${np.exercise}`);
        exerciseStr = exerciseParts.join(" | ");
      }

      // Consolidar sociales checkboxes
      const socials = [];
      if (np.social_volunteer) socials.push("Voluntariado");
      if (np.social_sports_club) socials.push("Club deportivo");
      if (np.social_cultural_events) socials.push("Eventos culturales");
      if (np.social_family_friends) socials.push("Reuniones familiares/amigos");
      const socialStr = [socials.join(", "), np.social_activities].filter(Boolean).join(" | ");

      // Consolidar nutrición
      const dietParts = [];
      if (np.meals_per_day) dietParts.push(`Comidas/día: ${np.meals_per_day}`);
      if (np.favorite_foods) dietParts.push(`Preferidos: ${np.favorite_foods}`);
      if (np.foods_to_avoid) dietParts.push(`Evita: ${np.foods_to_avoid}`);
      const dietOtherStr = dietParts.join(" | ");

      // Consolidar actividades económicas (múltiples)
      let economicStr = "";
      if (Array.isArray(np.economic_activities) && np.economic_activities.length > 0) {
        const activities = np.economic_activities.map((a, i) => {
          const sec = a && a.sector ? a.sector : "";
          const fields = [];
          if (a && a.employment_type) fields.push(a.employment_type);
          if (sec) fields.push(`Ramo: ${sec}`);
          if (a && a.role) fields.push(`Puesto: ${a.role}`);
          if (a && (a.days_per_week || a.days_per_week === 0)) fields.push(`Días/sem: ${a.days_per_week}`);
          return fields.length ? `${i + 1}) ${fields.join(" | ")}` : "";
        });
        economicStr = activities.filter(Boolean).join("; ");
      }

      return {
        // Campos existentes directos
        sex: np.sex || "",
        nationality: np.nationality || "",
        ethnic_group: np.ethnic_group || "",
        languages: np.languages || "",
        blood_type: np.blood_type || "",

        // Origen y residencia consolidados
        other_origin_info: originStr || undefined,
        address: addressStr || undefined,
        other_living_info: np.residence_other_info || undefined,

        // Política, social y económica directos
        housing_type: np.housing_type || undefined,
        civil_status: np.civil_status || undefined,
        cohabitants: np.cohabitants || undefined,
        dependents: np.dependents || undefined,
        economic_activity: economicStr || np.economic_activity || undefined,
        // Educación
        education_institution: undefined, // podría agregarse en el futuro
        academic_degree: np.education_level || undefined,
        career: undefined,
        institute_registration_number: undefined,
        other_education_info: np.education_details || undefined,

        // Prácticas espirituales consolidadas
        spiritual_practices: spiritualStr || undefined,

        // Viajes recientes
        recent_travel: travelStr || undefined,

        // Estilo de vida
        exercise_details: exerciseStr || undefined,
        // Higiene: mapear a enum QualityLevel (good/regular/bad)
        hygiene_quality: (np.hygiene === "Buena" && "good") || (np.hygiene === "Regular" && "regular") || (np.hygiene === "Mala" && "bad") || undefined,
        other_hygiene_info: (() => {
          const notes = [];
          if (np.tattoos && np.tattoo_locations) notes.push(`Zonas tatuadas: ${np.tattoo_locations}`);
          if (np.piercings && np.piercing_locations) notes.push(`Zonas perforadas: ${np.piercing_locations}`);
          return notes.length ? notes.join(" | ") : undefined;
        })(),

        // Hobbies y recreación
        hobbies: np.hobbies || undefined,
        other_recreational_info: socialStr || undefined,

        // Piercings/Tatuajes (Enum YesNo)
        has_piercings: np.piercings === undefined ? undefined : yesNo(!!np.piercings),
        has_tattoos: np.tattoos === undefined ? undefined : yesNo(!!np.tattoos),

        // Consumos
        // Consumos: construir descripción si está marcado el consumo
        alcohol_use: np.consume_alcohol ? [
          np.alcohol_frequency && `Frecuencia: ${np.alcohol_frequency}`,
          np.alcohol_days_per_week && `Días/sem: ${np.alcohol_days_per_week}`,
          np.alcohol_type && `Tipo: ${np.alcohol_type}`,
          np.alcohol_quantity && `Cantidad: ${np.alcohol_quantity}`,
        ].filter(Boolean).join(" | ") || "consume" : undefined,
        tobacco_use: np.consume_tobacco ? [
          np.tobacco_frequency && `Frecuencia: ${np.tobacco_frequency}`,
          np.tobacco_days_per_week && `Días/sem: ${np.tobacco_days_per_week}`,
          np.tobacco_quantity && `Cantidad: ${np.tobacco_quantity}`,
        ].filter(Boolean).join(" | ") || "consume" : undefined,
        other_drug_use: np.consume_recreational_drugs ? [
          np.recreational_drugs_frequency && `Frecuencia: ${np.recreational_drugs_frequency}`,
          np.recreational_drugs_days_per_week && `Días/sem: ${np.recreational_drugs_days_per_week}`,
          np.recreational_drug_type && `Tipo: ${np.recreational_drug_type}`,
          np.recreational_drugs_quantity && `Cantidad: ${np.recreational_drugs_quantity}`,
        ].filter(Boolean).join(" | ") || "consume" : undefined,
        addictions: np.addictions || undefined,

        // Nutrición
        meals_per_day: np.meals_per_day ? Number(np.meals_per_day) : undefined,
        supplements: np.diet_supplements || undefined,
        other_diet_info: dietOtherStr || undefined,
      };
    };

    const transformed = {
      ...form,
      non_pathological_background: buildNonPathPayload(form.non_pathological_background),
      medical_file_id: medicalFileId
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/backgrounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(transformed)
      });

      const data = await response.json();
      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error("Error en antecedentes:", data);
        alert(`Error al guardar antecedentes: ${data.error || data.message || "Revisa la consola"}`);
        return;
      }

      const element = document.querySelector("form");
      const canvas = await html2canvas(element);
      const dataUrl = canvas.toDataURL("image/png");

      const snapshotRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload_snapshot/${medicalFileId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ snapshot_url: dataUrl })
      });

      if (!snapshotRes.ok) {
        const snapshotData = await snapshotRes.json();
        // console logging removed to satisfy lint rules; show alert for the user instead
        alert(`Error al subir snapshot: ${snapshotData.error || "Revisa la consola"}`);
        return;
      }

      alert("Antecedentes guardados, snapshot creado y expediente enviado a revisión ✅");
      setForm(initialState);

    } catch (err) {
      // Report error to the user instead of using console to satisfy lint rules
      alert("Error de conexión con el servidor.");
    }
  };

  useEffect(() => {
    const fetchMedicalFile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/medical_file/${medicalFileId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
          // Mostrar error al usuario en lugar de usar console
          alert(`Error al cargar expediente: ${data.error || data.message || "Error desconocido"}`);
          return;
        }

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
        if (data.user) setUserInfo({ birth_day: data.user.birth_day });
      } catch (error) {
        alert(`Error al cargar expediente: ${error?.message || error}`);
      }
    };

    fetchMedicalFile();
  }, [medicalFileId]);

  const calcAge = (isoDate) => {
    if (!isoDate) return "";
    try {
      const b = new Date(isoDate);
      const today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      const m = today.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
      return String(age);
    } catch {
      return "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="row p-4 rounded shadow-md max-w-5xl mx-auto" data-bs-theme="dark">
      <h2 className="text-2xl font-bold mb-4">Antecedentes Médicos del Paciente</h2>

      {/* ---------- 🧬 ANTECEDENTES NO PATOLÓGICOS ---------- */}
      <h4 className="mt-4 mb-3 text-lg fw-bold">Antecedentes No Patológicos</h4>

      {/* 1. Identidad biológica */}
      <div className="subgroup-card col-12">
        <div className="subgroup-title">1) Identidad biológica</div>
        <div className="col-6 mb-2">
          <label className="form-label">Fecha de nacimiento</label>
          <input type="date" className="form-control" value={userInfo.birth_day || ""} readOnly />
        </div>
        <div className="col-6 mb-2">
          <label className="form-label">Edad</label>
          <input type="text" className="form-control" value={calcAge(userInfo.birth_day)} readOnly />
        </div>
        <SelectOrOther
          label="Sexo biológico"
          name="sex"
          value={form.non_pathological_background.sex}
          options={["Femenino", "Masculino", "Otros"]}
          includeOtherChoice={false}
          onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
        />
        <SelectOrOther
          label="Tipo de sangre"
          name="blood_type"
          value={form.non_pathological_background.blood_type}
          options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Desconocido"]}
          includeOtherChoice={true}
          onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
        />
        <SelectOrOther
          label="Grupo étnico"
          name="ethnic_group"
          value={form.non_pathological_background.ethnic_group}
          options={[
            "Mestizo",
            "Indígena",
            "Afrodescendiente",
            "Caucásico",
            "Asiático",
          ]}
          includeOtherChoice={true}
          onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
        />
      </div>

      {/* 2. Identidad geográfica */}
      <div className="subgroup-card col-12">
        <div className="subgroup-title">2) Identidad geográfica</div>
        <div className="subgroup-subtitle">a) Origen</div>
        {[
          { key: "birth_country", label: "País de nacimiento" },
          { key: "birth_state", label: "Estado" },
          { key: "birth_city", label: "Municipio / Ciudad" },
          { key: "birth_neighborhood", label: "Colonia / Barrio" },
          { key: "birth_street", label: "Calle" },
          { key: "birth_ext_int", label: "No. Ext. / No. Int." },
          { key: "birth_zip", label: "Código Postal" },
        ].map(({ key, label }) => (
          <div key={key} className="col-6 mb-2">
            <label className="form-label">{label}</label>
            <input type="text" className="form-control" name={key} value={form.non_pathological_background[key]} onChange={(e) => handleChange(e, "non_pathological_background")} />
          </div>
        ))}
        <div className="col-12 mb-3">
          <label className="form-label">Otros datos (nacimiento)</label>
          <textarea className="form-control" name="birth_other_info" value={form.non_pathological_background.birth_other_info} onChange={(e) => handleChange(e, "non_pathological_background")} />
        </div>
        <div className="subgroup-subtitle">b) Residencia actual</div>
        {[
          { key: "residence_country", label: "País" },
          { key: "residence_state", label: "Estado" },
          { key: "residence_city", label: "Municipio / Ciudad" },
          { key: "residence_neighborhood", label: "Colonia / Barrio" },
          { key: "residence_street", label: "Calle" },
          { key: "residence_ext_int", label: "No. Ext. / No. Int." },
          { key: "residence_zip", label: "Código Postal" },
        ].map(({ key, label }) => (
          <div key={key} className="col-6 mb-2">
            <label className="form-label">{label}</label>
            <input type="text" className="form-control" name={key} value={form.non_pathological_background[key]} onChange={(e) => handleChange(e, "non_pathological_background")} />
          </div>
        ))}
        <div className="col-12 mb-3">
          <label className="form-label">Otros datos (dirección)</label>
          <textarea className="form-control" name="residence_other_info" value={form.non_pathological_background.residence_other_info} onChange={(e) => handleChange(e, "non_pathological_background")} />
        </div>
      </div>

      {/* 3. Identidad política social y económica */}
      <div className="subgroup-card col-12">
        <div className="subgroup-title">3) Identidad política, social y económica</div>
        {/* Nacionalidad con selector de países (México pre-seleccionado) */}
        <SelectOrOther
          label="Nacionalidad"
          name="nationality"
          value={form.non_pathological_background.nationality}
          options={COUNTRIES}
          includeOtherChoice={true}
          onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
        />
        {/* Idiomas: multiselección con opción de agregar otros */}
        <MultiSelectOrOther
          label="Idiomas"
          name="languages"
          value={form.non_pathological_background.languages}
          options={[
            "Español",
            "Italiano",
            "Inglés",
            "Francés",
            "Mandarín",
            "Portugués",
            "Alemán",
            "Hindi",
          ]}
          columns={2}
          onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
        />
        {/* Nivel de educación */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label">Nivel de educación</label>
          <select
            className="form-select"
            name="education_level"
            value={form.non_pathological_background.education_level}
            onChange={(e) => handleChange(e, "non_pathological_background")}
          >
            <option value="">Selecciona…</option>
            {[
              "Analfabeta",
              "Sin estudios formales",
              "Primaria",
              "Secundaria",
              "Preparatoria",
              "Carrera técnica",
              "Licenciatura",
              "Maestría",
              "Doctorado",
            ].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Detalle de estudios para niveles avanzados */}
        {(["Carrera técnica", "Licenciatura", "Maestría", "Doctorado"].includes(form.non_pathological_background.education_level)) && (
          <div className="col-12 mb-2">
            <label className="form-label">Detalle de estudios</label>
            <textarea
              className="form-control"
              name="education_details"
              placeholder="Programa/área, institución, país, año de egreso, cédula u otros detalles relevantes"
              value={form.non_pathological_background.education_details}
              onChange={(e) => handleChange(e, "non_pathological_background")}
            />
          </div>
        )}

        {/* Actividad económica (una o más) */}
        <div className="col-12">
          <div className="subgroup-subtitle">Actividad económica</div>
          {(form.non_pathological_background.economic_activities || []).map((act, idx) => {
            const key = `eco-${idx}`;
            return (
              <div key={key} className="border rounded p-3 mb-3">
                <div className="mb-2 fw-semibold">Actividad #{idx + 1}</div>
                <div className="row g-3 align-items-end">
                  {/* Tipo de relación laboral */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Relación laboral</label>
                    <select
                      className="form-select"
                      value={act.employment_type || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = { ...prev };
                          const list = [...(next.non_pathological_background.economic_activities || [])];
                          list[idx] = { ...list[idx], employment_type: value };
                          next.non_pathological_background.economic_activities = list;
                          return next;
                        });
                      }}
                    >
                      <option value="">Selecciona…</option>
                      <option value="Empleado">Empleado</option>
                      <option value="Negocio propio">Negocio propio</option>
                    </select>
                  </div>

                  {/* Ramo */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ramo</label>
                    <select
                      className="form-select"
                      value={(act.sector && ["Salud", "Tecnología", "Económico administrativos", "Educación", "Otro"].includes(act.sector)) ? act.sector : (act.sector ? "Otro" : "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = { ...prev };
                          const list = [...(next.non_pathological_background.economic_activities || [])];
                          const item = { ...list[idx] };
                          if (value === "Otro") {
                            item.sector = item.sector && !["Salud", "Tecnología", "Económico administrativos", "Educación", "Otro"].includes(item.sector) ? item.sector : "";
                          } else {
                            item.sector = value;
                          }
                          list[idx] = item;
                          next.non_pathological_background.economic_activities = list;
                          return next;
                        });
                      }}
                    >
                      <option value="">Selecciona…</option>
                      <option value="Salud">Salud</option>
                      <option value="Tecnología">Tecnología</option>
                      <option value="Económico administrativos">Económico administrativos</option>
                      <option value="Educación">Educación</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  {/* Ramo - Otro (texto) */}
                  {(!["Salud", "Tecnología", "Económico administrativos", "Educación"].includes(act.sector || "")) && (
                    <div className="col-12 col-md-4">
                      <label className="form-label">Ramo (otro)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={act.sector && !["Salud", "Tecnología", "Económico administrativos", "Educación"].includes(act.sector) ? act.sector : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm((prev) => {
                            const next = { ...prev };
                            const list = [...(next.non_pathological_background.economic_activities || [])];
                            list[idx] = { ...list[idx], sector: value };
                            next.non_pathological_background.economic_activities = list;
                            return next;
                          });
                        }}
                        placeholder="Especifica el ramo"
                      />
                    </div>
                  )}

                  {/* Puesto */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Puesto</label>
                    <input
                      type="text"
                      className="form-control"
                      value={act.role || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = { ...prev };
                          const list = [...(next.non_pathological_background.economic_activities || [])];
                          list[idx] = { ...list[idx], role: value };
                          next.non_pathological_background.economic_activities = list;
                          return next;
                        });
                      }}
                    />
                  </div>

                  {/* Días por semana */}
                  <div className="col-6 col-md-3">
                    <label className="form-label">Días por semana</label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      className="form-control"
                      value={act.days_per_week ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = raw === "" ? "" : Math.max(0, Math.min(7, parseInt(raw, 10) || 0));
                        setForm((prev) => {
                          const next = { ...prev };
                          const list = [...(next.non_pathological_background.economic_activities || [])];
                          list[idx] = { ...list[idx], days_per_week: num };
                          next.non_pathological_background.economic_activities = list;
                          return next;
                        });
                      }}
                    />
                  </div>

                  {/* Botón eliminar */}
                  <div className="col-6 col-md-5 d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => {
                        setForm((prev) => {
                          const next = { ...prev };
                          const list = [...(next.non_pathological_background.economic_activities || [])];
                          list.splice(idx, 1);
                          next.non_pathological_background.economic_activities = list;
                          return next;
                        });
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-outline-primary mb-3"
            onClick={() => {
              setForm((prev) => {
                const next = { ...prev };
                const list = [...(next.non_pathological_background.economic_activities || [])];
                list.push({ employment_type: "", sector: "", role: "", days_per_week: "" });
                next.non_pathological_background.economic_activities = list;
                return next;
              });
            }}
          >
            Agregar actividad económica
          </button>
        </div>

        {/* Estado civil con opción Otro */}
        <div className="col-12 col-md-6 mb-2">
          <SelectOrOther
            label="Estado civil"
            name="civil_status"
            value={form.non_pathological_background.civil_status}
            options={["Soltero", "Casado", "Divorciado", "Unión libre"]}
            includeOtherChoice={true}
            onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
          />
        </div>
        {/* Tipo de vivienda */}
        <div className="col-12 col-md-6 mb-2">
          <SelectOrOther
            label="Tipo de vivienda"
            name="housing_type"
            value={form.non_pathological_background.housing_type}
            options={["Propia", "Renta"]}
            includeOtherChoice={true}
            onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
          />
        </div>
        {/* Cohabitantes como multiselección */}
        <div className="col-12 col-md-6 mb-2">
          <MultiSelectOrOther
            label="Cohabitantes"
            name="cohabitants"
            value={form.non_pathological_background.cohabitants}
            options={["Abuelos", "Padres", "Hermanos", "Cónyuge", "Hijos"]}
            columns={2}
            onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
          />
        </div>
        {/* Dependientes como multiselección */}
        <div className="col-12 col-md-6 mb-2">
          <MultiSelectOrOther
            label="Dependientes"
            name="dependents"
            value={form.non_pathological_background.dependents}
            options={["Abuelos", "Padres", "Hermanos", "Cónyuge", "Hijos"]}
            columns={2}
            onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
          />
        </div>
        {/* Prácticas Sociales */}
        <div className="subgroup-subtitle">Actividades Sociales</div>
        {[
          { key: "social_sports_club", label: "Club deportivo" },
          { key: "social_cultural_events", label: "Eventos culturales" },
          { key: "social_family_friends", label: "Reuniones familiares / amigos" },
          { key: "social_volunteer", label: "Voluntariado" },
        ].map(({ key, label }) => (
          <div key={key} className="form-check col-6 mb-2">
            <input className="form-check-input" type="checkbox" name={key} checked={form.non_pathological_background[key]} onChange={(e) => handleChange(e, "non_pathological_background")} />
            <label className="form-check-label">{label}</label>
          </div>
        ))}
        <div className="col-6 mb-2">
          <label className="form-label">Hobbies</label>
          <input type="text" className="form-control" name="hobbies" value={form.non_pathological_background.hobbies} onChange={(e) => handleChange(e, "non_pathological_background")} />
        </div>
        {/* Práctica religiosa (multiselección) */}
        <div className="col-12 col-md-6 mb-2">
          <MultiSelectOrOther
            label="Práctica religiosa"
            name="religions"
            value={form.non_pathological_background.religions}
            options={["Católico", "Cristiano", "Mormón", "Judío", "Musulmán", "Budista"]}
            columns={2}
            onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
          />
        </div>
        {/* apartado b) retirado a solicitud */}
        {/* Viajes recientes como parte de Prácticas Sociales */}
        <div className="col-12 mt-3">
          <label className="form-label fw-semibold">Viajes recientes</label>
        </div>
        {[
          { key: "recent_travel_place", label: "Lugar" },
          { key: "recent_travel_date", label: "Fecha (MM/AAAA aprox.)" },
          { key: "recent_travel_duration", label: "Duración" },
          { key: "recent_travel_reason", label: "Motivo / nota" },
        ].map(({ key, label }) => (
          <div key={key} className="col-6 mb-2">
            <label className="form-label">{label}</label>
            <input
              type="text"
              className="form-control"
              name={key}
              value={form.non_pathological_background[key]}
              onChange={(e) => handleChange(e, "non_pathological_background")}
            />
          </div>
        ))}
        <div className="col-12 mb-2">
          <label className="form-label">Nota adicional (viajes recientes)</label>
          <input
            type="text"
            className="form-control"
            name="recent_travels"
            value={form.non_pathological_background.recent_travels}
            onChange={(e) => handleChange(e, "non_pathological_background")}
          />
        </div>
        <div className="col-12 mb-2">
          <label className="form-label">Nota adicional (actividades sociales)</label>
          <input
            type="text"
            className="form-control"
            name="social_activities"
            value={form.non_pathological_background.social_activities}
            onChange={(e) => handleChange(e, "non_pathological_background")}
          />
        </div>
      </div>

      {/* 6. Estilo de vida */}
      <div className="subgroup-card col-12">
        <div className="subgroup-title">6) Estilo de vida</div>
        <div className="subgroup-subtitle">a) Actividad física</div>
        {(form.non_pathological_background.exercise_activities || []).map((act, idx) => (
          <div key={`ex-${idx}`} className="border rounded p-3 mb-3">
            <div className="fw-semibold mb-2">Actividad física #{idx + 1}</div>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Tipo</label>
                <input
                  type="text"
                  className="form-control"
                  value={act.type}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => {
                      const next = { ...prev };
                      const list = [...(next.non_pathological_background.exercise_activities || [])];
                      list[idx] = { ...list[idx], type: value };
                      next.non_pathological_background.exercise_activities = list;
                      return next;
                    });
                  }}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Días/sem</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-control"
                  value={act.days_per_week}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => {
                      const next = { ...prev };
                      const list = [...(next.non_pathological_background.exercise_activities || [])];
                      list[idx] = { ...list[idx], days_per_week: value };
                      next.non_pathological_background.exercise_activities = list;
                      return next;
                    });
                  }}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Horas/sem</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="form-control"
                  value={act.hours_per_week}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => {
                      const next = { ...prev };
                      const list = [...(next.non_pathological_background.exercise_activities || [])];
                      list[idx] = { ...list[idx], hours_per_week: value };
                      next.non_pathological_background.exercise_activities = list;
                      return next;
                    });
                  }}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Enfoque</label>
                <select
                  className="form-select"
                  value={act.focus || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => {
                      const next = { ...prev };
                      const list = [...(next.non_pathological_background.exercise_activities || [])];
                      list[idx] = { ...list[idx], focus: value };
                      next.non_pathological_background.exercise_activities = list;
                      return next;
                    });
                  }}
                >
                  <option value="">Selecciona…</option>
                  <option value="Flexibilidad">Flexibilidad</option>
                  <option value="Fuerza">Fuerza</option>
                  <option value="Resistencia">Resistencia</option>
                  <option value="Potencia">Potencia</option>
                </select>
              </div>
              <div className="col-12 col-md-9">
                <label className="form-label">Nota</label>
                <input
                  type="text"
                  className="form-control"
                  value={act.note}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => {
                      const next = { ...prev };
                      const list = [...(next.non_pathological_background.exercise_activities || [])];
                      list[idx] = { ...list[idx], note: value };
                      next.non_pathological_background.exercise_activities = list;
                      return next;
                    });
                  }}
                />
              </div>
              <div className="col-12 col-md-3 d-flex align-items-end">
                {idx > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100"
                    onClick={() => {
                      setForm(prev => {
                        const next = { ...prev };
                        const list = [...(next.non_pathological_background.exercise_activities || [])];
                        list.splice(idx, 1);
                        next.non_pathological_background.exercise_activities = list;
                        return next;
                      });
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="col-12 mb-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => {
              setForm(prev => {
                const next = { ...prev };
                const list = [...(next.non_pathological_background.exercise_activities || [])];
                list.push({ type: "", days_per_week: "", hours_per_week: "", focus: "", note: "" });
                next.non_pathological_background.exercise_activities = list;
                return next;
              });
            }}
          >
            Agregar actividad física
          </button>
        </div>
        <div className="col-12 mb-2">
          <label className="form-label">Nota adicional (actividad física)</label>
          <input type="text" className="form-control" name="exercise" value={form.non_pathological_background.exercise} onChange={(e) => handleChange(e, "non_pathological_background")} />
        </div>
        <div className="subgroup-subtitle">b) Hábitos y cuidados personales</div>
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label">Higiene</label>
          <select
            className="form-select"
            name="hygiene"
            value={form.non_pathological_background.hygiene}
            onChange={(e) => handleChange(e, "non_pathological_background")}
          >
            <option value="">Selecciona…</option>
            <option value="Buena">Buena</option>
            <option value="Regular">Regular</option>
            <option value="Mala">Mala</option>
          </select>
        </div>
        {/* Bloque independiente: Tatuajes */}
        <div className="col-12 mb-3 border rounded p-3">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              name="tattoos"
              id="chk-tattoos"
              checked={form.non_pathological_background.tattoos}
              onChange={(e) => handleChange(e, "non_pathological_background")}
            />
            <label className="form-check-label ms-1" htmlFor="chk-tattoos">Tatuajes</label>
          </div>
          {form.non_pathological_background.tattoos && (
            <MultiSelectOrOther
              label="Zonas tatuadas"
              name="tattoo_locations"
              value={form.non_pathological_background.tattoo_locations}
              options={[
                "Cara",
                "Cuello",
                "Brazos y hombros",
                "Espalda",
                "Pecho y abdomen",
                "Genitales",
                "Piernas",
              ]}
              columns={2}
              includeOtherChoice={false}
              onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
            />
          )}
        </div>

        {/* Bloque independiente: Perforaciones */}
        <div className="col-12 mb-3 border rounded p-3">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              name="piercings"
              id="chk-piercings"
              checked={form.non_pathological_background.piercings}
              onChange={(e) => handleChange(e, "non_pathological_background")}
            />
            <label className="form-check-label ms-1" htmlFor="chk-piercings">Perforaciones</label>
          </div>
          {form.non_pathological_background.piercings && (
            <MultiSelectOrOther
              label="Zonas perforadas"
              name="piercing_locations"
              value={form.non_pathological_background.piercing_locations}
              options={[
                "Cara",
                "Cuello",
                "Brazos y hombros",
                "Espalda",
                "Pecho y abdomen",
                "Genitales",
                "Piernas",
              ]}
              columns={2}
              includeOtherChoice={false}
              onChange={(name, value) => handleChange({ target: { name, value } }, "non_pathological_background")}
            />
          )}
        </div>
        {/* Consumo de Tabaco */}
        <div className="col-12 mb-3 border rounded p-3">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              name="consume_tobacco"
              checked={form.non_pathological_background.consume_tobacco}
              onChange={(e) => handleChange(e, "non_pathological_background")}
              id="consume_tobacco"
            />
            <label htmlFor="consume_tobacco" className="form-check-label fw-semibold">Consumo de tabaco</label>
          </div>
          {form.non_pathological_background.consume_tobacco && (
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  name="tobacco_frequency"
                  value={form.non_pathological_background.tobacco_frequency}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                >
                  <option value="">Selecciona…</option>
                  <option value="Ocasional">Ocasional</option>
                  <option value="Diario">Diario</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Días/sem</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-control"
                  name="tobacco_days_per_week"
                  value={form.non_pathological_background.tobacco_days_per_week}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Cantidad (ej: cigarrillos/día)</label>
                <input
                  type="text"
                  className="form-control"
                  name="tobacco_quantity"
                  value={form.non_pathological_background.tobacco_quantity}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
            </div>
          )}
        </div>
        {/* Consumo de Alcohol */}
        <div className="col-12 mb-3 border rounded p-3">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              name="consume_alcohol"
              checked={form.non_pathological_background.consume_alcohol}
              onChange={(e) => handleChange(e, "non_pathological_background")}
              id="consume_alcohol"
            />
            <label htmlFor="consume_alcohol" className="form-check-label fw-semibold">Consumo de alcohol</label>
          </div>
          {form.non_pathological_background.consume_alcohol && (
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Tipo de bebida</label>
                <input
                  type="text"
                  className="form-control"
                  name="alcohol_type"
                  placeholder="Ej: cerveza, vino, destilados"
                  value={form.non_pathological_background.alcohol_type}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  name="alcohol_frequency"
                  value={form.non_pathological_background.alcohol_frequency}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                >
                  <option value="">Selecciona…</option>
                  <option value="Ocasional">Ocasional</option>
                  <option value="Diario">Diario</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Días/sem</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-control"
                  name="alcohol_days_per_week"
                  value={form.non_pathological_background.alcohol_days_per_week}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Cantidad (ej: copas/sem)</label>
                <input
                  type="text"
                  className="form-control"
                  name="alcohol_quantity"
                  value={form.non_pathological_background.alcohol_quantity}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
            </div>
          )}
        </div>
        {/* Consumo de Drogas Recreativas */}
        <div className="col-12 mb-3 border rounded p-3">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              name="consume_recreational_drugs"
              checked={form.non_pathological_background.consume_recreational_drugs}
              onChange={(e) => handleChange(e, "non_pathological_background")}
              id="consume_recreational_drugs"
            />
            <label htmlFor="consume_recreational_drugs" className="form-check-label fw-semibold">Drogas recreativas</label>
          </div>
          {form.non_pathological_background.consume_recreational_drugs && (
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label">Tipo de droga</label>
                <input
                  type="text"
                  className="form-control"
                  name="recreational_drug_type"
                  placeholder="Ej: cannabis, cocaína, MDMA"
                  value={form.non_pathological_background.recreational_drug_type}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  name="recreational_drugs_frequency"
                  value={form.non_pathological_background.recreational_drugs_frequency}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                >
                  <option value="">Selecciona…</option>
                  <option value="Ocasional">Ocasional</option>
                  <option value="Diario">Diario</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Días/sem</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-control"
                  name="recreational_drugs_days_per_week"
                  value={form.non_pathological_background.recreational_drugs_days_per_week}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Cantidad</label>
                <input
                  type="text"
                  className="form-control"
                  name="recreational_drugs_quantity"
                  value={form.non_pathological_background.recreational_drugs_quantity}
                  onChange={(e) => handleChange(e, "non_pathological_background")}
                />
              </div>
            </div>
          )}
        </div>
        {/* Campos libres adicionales */}
        {[
          { key: "addictions", label: "Adicciones" },
          { key: "others", label: "Otros" },
        ].map(({ key, label }) => (
          <div key={key} className="col-6 mb-2">
            <label className="form-label">{label}</label>
            <input type="text" className="form-control" name={key} value={form.non_pathological_background[key]} onChange={(e) => handleChange(e, "non_pathological_background")} />
          </div>
        ))}
        <div className="subgroup-subtitle">c) Antecedentes nutricionales</div>
        {[
          { key: "meals_per_day", label: "Número de comidas al día" },
          { key: "diet_supplements", label: "Suplementos" },
          { key: "favorite_foods", label: "Alimentos preferidos" },
          { key: "foods_to_avoid", label: "Alimentos que evita" },
        ].map(({ key, label }) => (
          <div key={key} className="col-6 mb-2">
            <label className="form-label">{label}</label>
            <input type="text" className="form-control" name={key} value={form.non_pathological_background[key]} onChange={(e) => handleChange(e, "non_pathological_background")} />
          </div>
        ))}
      </div>

      {/* ---------- PATOLÓGICOS ---------- */}
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes Patológicos</h4>
      {["personal_diseases", "medications", "hospitalizations", "surgeries", "traumatisms", "transfusions", "allergies", "others"].map((field) => (
        <div key={field} className="mb-2 col-6">
          <label className="block">{field.replace(/_/g, " ")}</label>
          <textarea name={field} value={form.patological_background[field]} onChange={(e) => handleChange(e, "patological_background")} className="form-control" />
        </div>
      ))}

      {/* ---------- FAMILIARES ---------- */}
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes Familiares</h4>
      {["hypertension", "diabetes", "cancer", "heart_disease", "kidney_disease", "liver_disease", "mental_illness", "congenital_malformations"].map((field) => (
        <div key={field} className="form-check col-6 mb-2">
          <input className="form-check-input" type="checkbox" name={field} checked={form.family_background[field]} onChange={(e) => handleChange(e, "family_background")} />
          <label className="form-check-label">{field.replace(/_/g, " ")}</label>
        </div>
      ))}
      <div className="mb-2 col-6">
        <label className="block">Otros antecedentes familiares</label>
        <textarea name="others" value={form.family_background.others} onChange={(e) => handleChange(e, "family_background")} className="form-control" />
      </div>

      {/* ---------- GINECOLÓGICOS ---------- */}
      <h4 className="mt-4 mb-2 text-lg font-semibold">Antecedentes Ginecológicos</h4>
      {["menarche_age", "pregnancies", "births", "c_sections", "abortions"].map((field) => (
        <div key={field} className="mb-2 col-6">
          <label className="block">{field.replace(/_/g, " ")}</label>
          <input type="text" name={field} value={form.gynecological_background[field]} onChange={(e) => handleChange(e, "gynecological_background")} className="form-control" />
        </div>
      ))}
      <SelectOrOther
        label="contraceptive method"
        name="contraceptive_method"
        value={form.gynecological_background.contraceptive_method}
        options={fieldOptions.gynecological_background.contraceptive_method}
        onChange={(name, value) => handleChange({ target: { name, value } }, "gynecological_background")}
      />
      <div className="mb-2 col-6">
        <label className="block">others</label>
        <input type="text" name="others" value={form.gynecological_background.others} onChange={(e) => handleChange(e, "gynecological_background")} className="form-control" />
      </div>

      <div className="mt-4 col-12">
        <button type="submit" className="btn btn-primary me-2">Guardar y enviar a revisión</button>
        <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>Cancelar</button>
      </div>
    </form>
  );
};

BackgroundForm.propTypes = {
  medicalFileId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default BackgroundForm;
