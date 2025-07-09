import React, { useEffect, useState } from 'react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const UsersTable = () => {
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/users`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener usuarios');
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    const confirmDelete = window.confirm("¿Estás seguro que deseas eliminar este usuario?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${backendUrl}/api/user/${userId}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar el usuario');
      }

      // Quitar el usuario eliminado del estado
      setUsers(users.filter(user => user.id !== userId));
      alert("Usuario eliminado correctamente");
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert("Error eliminando usuario");
    }
  };

  const handleApprove = async (userId) => {
    try {
      const response = await fetch(`${backendUrl}/api/validate_professional/${userId}`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'No se pudo validar al profesional');
        return;
      }

      alert("Profesional validado exitosamente");
      // Recargar la lista
      fetchUsers();
    } catch (error) {
      console.error('Error validando profesional:', error);
      alert('Error validando profesional');
    }
  };

  return (
    <div>
      <h3>Lista de Usuarios</h3>
      <table className="table table-hover table-dark">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre Completo</th>
            <th>Rol</th>
            <th>Status</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>
                {`${user.first_name || ""} ${user.second_name || ""} ${user.first_surname || ""} ${user.second_surname || ""}`}
              </td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td>
                <button
                  className="btn btn-success me-2"
                  onClick={() => handleApprove(user.id)}
                  disabled={user.status === "approved" || user.role !== "professional"}
                >
                  Aprobar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(user.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;
