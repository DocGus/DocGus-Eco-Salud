{userRole === "admin" && (
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
