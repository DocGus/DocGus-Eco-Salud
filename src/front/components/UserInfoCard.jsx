import React from "react";
import PropTypes from "prop-types";
import {
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaShieldAlt,
  FaCheckCircle,
  FaClock
} from "react-icons/fa";

const UserInfoCard = ({ user }) => {
  if (!user) return <p>Cargando datos del usuario...</p>;

  const {
    first_name,
    second_name,
    first_surname,
    second_surname,
    email,
    role,
    status,
    id
  } = user;

  const fullName = `${first_name || ""} ${second_name || ""} ${first_surname || ""} ${second_surname || ""}`.trim();

  // Traducción de roles a español
  const roleLabels = {
    admin: "Administrador",
    professional: "Profesional",
    student: "Estudiante",
    patient: "Paciente"
  };

  const translatedRole = roleLabels[role] || role;

  // Badge por estado (status)
  let statusBadge;
  switch (status) {
    case "approved":
      statusBadge = (
        <span className="badge bg-success">
          <FaCheckCircle className="me-1" /> Aprobado
        </span>
      );
      break;
    case "pre_approved":
      statusBadge = (
        <span className="badge bg-warning text-dark">
          <FaClock className="me-1" /> Pre-aprobado
        </span>
      );
      break;
    case "inactive":
      statusBadge = (
        <span className="badge bg-secondary">
          <FaClock className="me-1" /> Inactivo
        </span>
      );
      break;
    default:
      statusBadge = (
        <span className="badge bg-light text-dark">
          <FaClock className="me-1" /> Desconocido
        </span>
      );
      break;
  }

  // Colores de fondo para cada rol
  const roleColorMap = {
    admin: "bg-primary",
    professional: "bg-info text-dark",
    student: "bg-success",
    patient: "bg-secondary"
  };

  const roleBadge = (
    <span className={`badge ${roleColorMap[role] || "bg-light text-dark"}`}>
      <FaShieldAlt className="me-1" /> {translatedRole}
    </span>
  );

  const infoBoxes = [
    {
      label: "ID",
      icon: <FaIdCard className="me-2" />,
      value: id
    },
    {
      label: "Nombre Completo",
      icon: <FaUser className="me-2" />,
      value: fullName || "No registrado"
    },
    {
      label: "Correo Electrónico",
      icon: <FaEnvelope className="me-2" />,
      value: email
    },
    {
      label: "Rol",
      icon: <FaShieldAlt className="me-2" />,
      value: roleBadge
    },
    {
      label: "Estado",
      icon: <FaCheckCircle className="me-2" />,
      value: statusBadge
    }
  ];

  return (
    <div className="card shadow mb-4" style={{ backgroundColor: "#343a40", color: "#fff", border: "1px solid #fff" }}>
      <div className="card-body">
        <h5 className="card-title mb-4 d-flex align-items-center text-white">
          <FaUser className="me-2" /> Información del Usuario
        </h5>

        <div className="row g-3">
          {infoBoxes.map((box, index) => (
            <div key={index} className="col-12 col-md-6">
              <div className="p-3 rounded border" style={{ backgroundColor: "#495057", borderColor: "#6c757d", color: "#fff" }}>
                <p className="mb-1 d-flex align-items-center fw-bold text-white">
                  {box.icon} {box.label}
                </p>
                <p className="fs-6 text-white">{box.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
UserInfoCard.propTypes = {
  user: PropTypes.shape({
    first_name: PropTypes.string,
    second_name: PropTypes.string,
    first_surname: PropTypes.string,
    second_surname: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    status: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })
};

export default UserInfoCard;
