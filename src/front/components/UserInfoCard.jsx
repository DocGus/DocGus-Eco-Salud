import React from "react";

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
    id,
  } = user;

  return (
    <div className="card mb-4" style={{ backgroundColor: "#495057", color: "#fff", border: "1px solid #fff" }}>
      <div className="card-body">
        <h5 className="card-title">Información del Usuario</h5>
        <p className="card-text"><strong>ID:</strong> {id}</p>
        <p className="card-text">
          <strong>Nombre:</strong> {`${first_name || ""} ${second_name || ""} ${first_surname || ""} ${second_surname || ""}`}
        </p>
        <p className="card-text"><strong>Email:</strong> {email}</p>
        <p className="card-text"><strong>Rol:</strong> {role}</p>
        <p className="card-text"><strong>Status:</strong> {status}</p>
      </div>
    </div>
  );
};

export default UserInfoCard;
