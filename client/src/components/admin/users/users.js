import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './users.css';
import { UserContext } from '../../../context/UserContext';

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
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');
  const { refreshUserById } = useContext(UserContext);

  // Загрузка списка пользователей
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Обработка ошибок API
  const handleApiError = (err) => {
    console.error('API Error:', err);
    
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Проблема с авторизацией
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      window.location.href = '/login';
      return;
    }
    
    setError(err.response?.data?.error || 'Произошла ошибка при выполнении запроса');
    setTimeout(() => setError(null), 5000); // Убираем сообщение через 5 секунд
  };

  // Начало редактирования пользователя
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  // Изменение значений полей формы
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Сохранение изменений
  const handleSaveChanges = async () => {
    try {
      setError(null);
      
      const response = await axios.put(
        `http://localhost:3000/api/admin/users/${editingUser.id}`,
        editFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список пользователей
      setUsers(users.map(user => 
        user.id === editingUser.id ? response.data.user : user
      ));
      
      // Обновляем глобальные данные пользователя
      await refreshUserById(editingUser.id);
      
      setSuccessMessage('Пользователь успешно обновлен');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Закрываем окно редактирования
      setEditingUser(null);
    } catch (err) {
      handleApiError(err);
    }
  };

  // Удаление пользователя
  const handleDeleteClick = async (userId) => {
    // Запрос подтверждения
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      setError(null);
      
      await axios.delete(`http://localhost:3000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список пользователей
      setUsers(users.filter(user => user.id !== userId));
      
      setSuccessMessage('Пользователь успешно удален');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      handleApiError(err);
    }
  };

  // Функция форматирования даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Функция для отображения роли на русском
  const getRoleText = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'coach': return 'Тренер';
      case 'client': return 'Клиент';
      default: return role;
    }
  };

  return (
    <div className="admin-users-container">
      <h2>Управление пользователями</h2>
      
      {error && <div className="alert error-alert">{error}</div>}
      {successMessage && <div className="alert success-alert">{successMessage}</div>}
      
      {loading ? (
        <div className="loading-spinner">Загрузка пользователей...</div>
      ) : (
        <div className="table-container">
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
                      className="btn edit-btn"
                      onClick={() => handleEditClick(user)}
                    >
                      Редактировать
                    </button>
                    <button 
                      className="btn delete-btn"
                      onClick={() => handleDeleteClick(user.id)}
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
      
      {/* Модальное окно редактирования */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3>Редактирование пользователя</h3>
            
            <div className="form-group">
              <label>Имя:</label>
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={editFormData.email}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="form-group">
              <label>Роль:</label>
              <select
                name="role"
                value={editFormData.role}
                onChange={handleFormChange}
              >
                <option value="client">Клиент</option>
                <option value="coach">Тренер</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            
            <div className="modal-buttons">
              <button className="btn cancel-btn" onClick={handleCancelEdit}>
                Отмена
              </button>
              <button className="btn save-btn" onClick={handleSaveChanges}>
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