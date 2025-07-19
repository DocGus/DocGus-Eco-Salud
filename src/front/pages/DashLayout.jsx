import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

const DashLayout = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role || '';

  const linkStyle = {
    color: '#fff',
    backgroundColor: '#495057',
    marginBottom: '10px',
    border: '1px solid #fff',
    padding: '10px',
    borderRadius: '8px',
    textAlign: 'center',
    textDecoration: 'none'
  };

  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: '#6c757d',
    fontWeight: 'bold'
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="container-fluid min-vh-100 d-flex" style={{ backgroundColor: '#800000' }}>
      <div className="d-flex flex-column col-12 col-md-3 p-3" style={{ backgroundColor: '#343a40', borderRight: '1px solid #fff' }}>
        <h4 className="text-white text-center mb-4">Panel</h4>

        {userRole === 'admin' && (
          <>
            <Link
              to="/dashboard/admin"
              style={isActive("/dashboard/admin") ? activeLinkStyle : linkStyle}
            >
              Dashboard Admin
            </Link>
            <Link
              to="/dashboard/admin/users_table"
              style={isActive("/dashboard/admin/users_table") ? activeLinkStyle : linkStyle}
            >
              Usuarios
            </Link>
          </>
        )}

        {userRole === 'student' && (
          <>
            <Link
              to="/dashboard/student"
              style={isActive("/dashboard/student") ? activeLinkStyle : linkStyle}
            >
              Dashboard Estudiante
            </Link>
            <Link
              to="/dashboard/student/request_approval"
              style={isActive("/dashboard/student/request_approval") ? activeLinkStyle : linkStyle}
            >
              Solicitar Aprobación
            </Link>
            <Link
              to="/dashboard/student/patient_requests"
              style={isActive("/dashboard/student/patient_requests") ? activeLinkStyle : linkStyle}
            >
              Validar Solicitudes
            </Link>
            <Link
              to="/dashboard/student/assigned_patients"
              style={isActive("/dashboard/student/assigned_patients") ? activeLinkStyle : linkStyle}
            >
              Pacientes Asignados
            </Link>
          </>
        )}

        {userRole === 'professional' && (
          <>
            <Link
              to="/dashboard/professional"
              style={isActive("/dashboard/professional") ? activeLinkStyle : linkStyle}
            >
              Dashboard Profesional
            </Link>
            <Link
              to="/dashboard/professional/validate_students"
              style={isActive("/dashboard/professional/validate_students") ? activeLinkStyle : linkStyle}
            >
              Validar Estudiantes
            </Link>
            <Link
              to="/dashboard/professional/review_files"
              style={isActive("/dashboard/professional/review_files") ? activeLinkStyle : linkStyle}
            >
              Revisar Expedientes
            </Link>
          </>
        )}

        {userRole === 'patient' && (
          <>
            <Link
              to="/dashboard/patient"
              style={isActive("/dashboard/patient") ? activeLinkStyle : linkStyle}
            >
              Mi Dashboard
            </Link>
            <Link
              to="/dashboard/patient/request_student"
              style={isActive("/dashboard/patient/request_student") ? activeLinkStyle : linkStyle}
            >
              Solicitar Estudiante
            </Link>
          </>
        )}
      </div>

      <div className="col-12 col-md-9 p-4">
        <div className="card p-4" style={{ backgroundColor: '#343a40', border: '1px solid #fff', color: '#fff' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashLayout;
