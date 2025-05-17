import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CoachManagement.css';

const CoachManagement = () => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    loadCoaches();
    loadUsers();
  }, []);
  
  const loadCoaches = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/admin/coaches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCoaches(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка при загрузке списка тренеров:', err);
      setError('Не удалось загрузить список тренеров');
    } finally {
      setLoading(false);
    }
  };
  
  const loadUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Фильтруем пользователей, которые еще не тренеры
      const nonCoachUsers = response.data.filter(
        user => user.role !== 'coach'
      );
      
      setUsers(nonCoachUsers);
    } catch (err) {
      console.error('Ошибка при загрузке списка пользователей:', err);
    }
  };
  
  const handleCreateCoach = async () => {
    if (!selectedUser) {
      alert('Выберите пользователя');
      return;
    }
    
    try {
      await axios.post(
        'http://localhost:3000/api/admin/coaches',
        { user_id: selectedUser },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowAddForm(false);
      setSelectedUser('');
      loadCoaches();
      loadUsers();
    } catch (err) {
      console.error('Ошибка при создании тренера:', err);
      alert(err.response?.data?.error || 'Ошибка при создании тренера');
    }
  };
  
  const handleDeleteCoach = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого тренера?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/admin/coaches/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      loadCoaches();
      loadUsers();
    } catch (err) {
      console.error('Ошибка при удалении тренера:', err);
      alert(err.response?.data?.error || 'Не удалось удалить тренера');
    }
  };

  return (
    <div className="coach-management">
      <div className="coach-header">
        <h2>Управление тренерами</h2>
        <button 
          className="add-coach-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Отмена' : 'Добавить тренера'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="add-coach-form">
          <h3>Назначить пользователя тренером</h3>
          <div className="form-group">
            <label htmlFor="user-select">Выберите пользователя:</label>
            <select
              id="user-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
            >
              <option value="">-- Выберите пользователя --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <button 
            className="create-coach-button"
            onClick={handleCreateCoach}
            disabled={!selectedUser}
          >
            Назначить тренером
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="loading-message">Загрузка тренеров...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : coaches.length === 0 ? (
        <div className="empty-message">
          Нет доступных тренеров. Создайте тренера из пользователя.
        </div>
      ) : (
        <div className="coaches-table-container">
          <table className="coaches-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Специализация</th>
                <th>Опыт (лет)</th>
                <th>Рейтинг</th>
                <th>Бассейн</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map(coach => (
                <tr key={coach.id}>
                  <td>{coach.coach_name}</td>
                  <td>{coach.email}</td>
                  <td>{coach.specialty || 'Не указана'}</td>
                  <td>{coach.experience}</td>
                  <td>{coach.rating}</td>
                  <td>{coach.pool_name || 'Не назначен'}</td>
                  <td className="action-buttons">
                    <Link 
                      to={`/admin/coaches/${coach.id}/view`}
                      className="view-button"
                    >
                      Просмотр
                    </Link>
                    <Link 
                      to={`/admin/coaches/${coach.id}/edit`}
                      className="edit-button"
                    >
                      Изменить
                    </Link>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteCoach(coach.id)}
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
    </div>
  );
};

export default CoachManagement;