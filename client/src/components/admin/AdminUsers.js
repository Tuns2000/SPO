import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/AdminUsers.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка при получении пользователей:', err);
      setError('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role || 'client'
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return;

      const response = await axios.put(
        `http://localhost:3000/api/admin/users/${editingUser.id}`,
        editFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Обновляем список пользователей
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...editFormData } 
          : user
      ));

      setEditingUser(null);
    } catch (err) {
      console.error('Ошибка при обновлении пользователя:', err);
      setError('Не удалось обновить информацию о пользователе');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Удаляем пользователя из списка
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Ошибка при удалении пользователя:', err);
      setError('Не удалось удалить пользователя');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Н/Д';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return <div className="loading">Загрузка пользователей...</div>;
  }

  return (
    <div className="admin-users-container">
      <h1>Управление пользователями</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'admin' ? 'Администратор' : 
                     user.role === 'coach' ? 'Тренер' : 'Клиент'}
                  </span>
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditClick(user)}
                    >
                      Изменить
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модальное окно для редактирования пользователя */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Изменение данных пользователя</h2>
            
            <div className="form-group">
              <label>Имя:</label>
              <input 
                type="text" 
                name="name" 
                value={editFormData.name} 
                onChange={handleEditFormChange} 
              />
            </div>
            
            <div className="form-group">
              <label>Email:</label>
              <input 
                type="email" 
                name="email" 
                value={editFormData.email} 
                onChange={handleEditFormChange} 
              />
            </div>
            
            <div className="form-group">
              <label>Роль:</label>
              <select 
                name="role" 
                value={editFormData.role} 
                onChange={handleEditFormChange}
              >
                <option value="client">Клиент</option>
                <option value="coach">Тренер</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            
            <div className="modal-actions">
              <button 
                className="save-button"
                onClick={handleUpdateUser}
              >
                Сохранить
              </button>
              <button 
                className="cancel-button"
                onClick={() => setEditingUser(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;