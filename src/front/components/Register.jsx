import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const roleFromURL = queryParams.get("role") || "";

  const [formData, setFormData] = useState({
    first_name: "",
    second_name: "",
    first_surname: "",
    second_surname: "",
    birth_day: "",
    phone: "",
    email: "",
    password: "",
    role: roleFromURL,
    institution: "",
    career: "",
    academic_grade: "",
    register_number: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Si quieres que el rol se actualice si cambia la URL (opcional)
  useEffect(() => {
    setFormData(prev => ({ ...prev, role: roleFromURL }));
  }, [roleFromURL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validaciones básicas
    if (!formData.first_name || !formData.first_surname || !formData.birth_day || !formData.email || !formData.password || !formData.role) {
      setError("Por favor llena todos los campos obligatorios.");
      return;
    }

    if (formData.role === "professional" || formData.role === "student") {
      if (!formData.institution || !formData.career || !formData.academic_grade || !formData.register_number) {
        setError("Por favor llena todos los campos académicos obligatorios.");
        return;
      }
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Error al registrar");
      } else {
        setSuccess("Registro exitoso. Redirigiendo al inicio de sesión...");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError("Ocurrió un error en el servidor.");
    }
  };

  const inputStyle = {
    backgroundColor: "#495057",
    color: "#fff",
    border: "1px solid #fff"
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center px-3" style={{ backgroundColor: "#800000", color: "#fff" }}>
      <div className="card p-4 w-100" style={{ maxWidth: "900px", backgroundColor: "#343a40", border: "1px solid #fff" }}>
        <h2 className="text-center text-white mb-4">Registro de {formData.role}</h2>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* Campos básicos */}
            {[
              { label: "Primer Nombre", name: "first_name", type: "text", required: true },
              { label: "Segundo Nombre", name: "second_name", type: "text" },
              { label: "Primer Apellido", name: "first_surname", type: "text", required: true },
              { label: "Segundo Apellido", name: "second_surname", type: "text" },
              { label: "Fecha de Nacimiento", name: "birth_day", type: "date", required: true },
              { label: "Teléfono", name: "phone", type: "tel" },
              { label: "Correo Electrónico", name: "email", type: "email", required: true },
              { label: "Contraseña", name: "password", type: "password", required: true },
            ].map(field => (
              <div className="col-12 col-md-6 col-lg-4" key={field.name}>
                <label className="form-label text-white">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  className="form-control"
                  style={inputStyle}
                  value={formData[field.name]}
                  onChange={handleChange}
                  required={field.required}
                />
              </div>
            ))}

            {/* Campos académicos sólo para professional y student */}
            {(formData.role === "professional" || formData.role === "student") && (
              <>
                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label text-white">Institución</label>
                  <input
                    type="text"
                    name="institution"
                    className="form-control"
                    style={inputStyle}
                    value={formData.institution}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label text-white">Carrera</label>
                  <input
                    type="text"
                    name="career"
                    className="form-control"
                    style={inputStyle}
                    value={formData.career}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label text-white">Grado Académico</label>
                  <select
                    name="academic_grade"
                    className="form-select"
                    style={inputStyle}
                    value={formData.academic_grade}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled hidden>Selecciona</option>
                    {[
                      "no_formal_education",
                      "elementary_school",
                      "middle_school",
                      "high_school",
                      "technical",
                      "bachelor",
                      "postgraduate_studies"
                    ].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label text-white">Número de Registro</label>
                  <input
                    type="text"
                    name="register_number"
                    className="form-control"
                    style={inputStyle}
                    value={formData.register_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}
          </div>

          {error && <div className="alert alert-danger mt-4">{error}</div>}
          {success && <div className="alert alert-success mt-4">{success}</div>}

          <div className="text-center mt-4">
            <button type="submit" className="btn btn-light btn-lg text-dark w-100">Registrarme</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;