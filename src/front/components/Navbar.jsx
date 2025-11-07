import React from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/img/sansanarte.png";

export const Navbar = () => {
  const navigate = useNavigate();
  const hasToken = Boolean(localStorage.getItem("token"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Sesión cerrada correctamente");
    navigate("/"); // Redirige al home
  };

  return (
    <nav className="navbar navbar-expand-lg brand-navbar" data-bs-theme="dark">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img src={logo} alt="SanArte" className="brand-logo me-2" />
          <span className="fw-semibold">SanArte</span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link active" aria-current="page" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="https://hotmart.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Products
              </a>
            </li>
          </ul>
          {hasToken && (
            <button className="btn btn-outline-light btn-sm ms-lg-3" onClick={handleLogout}>
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
