import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminUsers.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // Загрузка списка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data);
        setLoading(false);
      } catch (err) {
        handleApiError(err);
        setLoading(false);
      }
    };
    
    if (token) {
      fetchUsers();
    } else {
      navigate('/login');
    }
  }, [token, navigate]);
  
  // Обработка ошибок API
  const handleApiError = (err) => {
    console.error('API Error:', err);
    
    if (err.response?.status === 401 || err.response?.status === 403) {
      navigate('/login', {
        state: { message: 'Сессия истекла или у вас нет прав доступа. Пожалуйста, войдите снова.' }
      });
      return;
    }
    
    setError(err.response?.data?.error || 'Произошла ошибка при выполнении запроса');
  };
  
  // Обработка изменений в форме
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Начать редактирование пользователя
  const startEditing = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
    setError(null);
    setSuccessMessage('');
  };
  
  // Отмена редактирования
  const cancelEditing = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: ''
    });
    setError(null);
  };
  
  // Сохранение изменений
  const saveChanges = async () => {
    try {
      setError(null);
      setSuccessMessage('');
      
      const response = await axios.put(
        `http://localhost:3000/api/admin/users/${editingUser.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список пользователей
      setUsers(users.map(user => 
        user.id === editingUser.id ? response.data.user : user
      ));
      
      setSuccessMessage('Пользователь успешно обновлен');
      setEditingUser(null);
    } catch (err) {
      handleApiError(err);
    }
  };
  
  // Удаление пользователя
  const deleteUser = async (userId) => {
    // Запрашиваем подтверждение
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      setError(null);
      setSuccessMessage('');
      
      await axios.delete(`http://localhost:3000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Удаляем пользователя из списка
      setUsers(users.filter(user => user.id !== userId));
      
      setSuccessMessage('Пользователь успешно удален');
    } catch (err) {
      handleApiError(err);
    }
  };
  
  // Функция для отображения роли на русском
  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'coach': return 'Тренер';
      case 'client': return 'Клиент';
      default: return role;
    }
  };
  
  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5);
  };
  
  return (
    <div className="admin-users-container">
      <h2>Управление пользователями</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {loading ? (
        <div className="loading">Загрузка пользователей...</div>
      ) : (
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
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td className="actions-cell">
                    <button 
                      className="edit-button"
                      onClick={() => startEditing(user)}
                    >
                      Редактировать
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => deleteUser(user.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Модальное окно редактирования пользователя */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="edit-user-modal">
            <h3>Редактирование пользователя</h3>
            
            <div className="form-group">
              <label>Имя:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Роль:</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="client">Клиент</option>
                <option value="coach">Тренер</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-button" onClick={cancelEditing}>
                Отмена
              </button>
              <button className="save-button" onClick={saveChanges}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;