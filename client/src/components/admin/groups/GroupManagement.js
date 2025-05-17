import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './GroupManagement.css';

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    loadGroups();
  }, []);
  
  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/admin/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGroups(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка при загрузке групп:', err);
      setError('Не удалось загрузить группы');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту группу? Все записи в группу будут отменены.')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/admin/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список после удаления
      loadGroups();
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      alert(err.response?.data?.error || 'Не удалось удалить группу');
    }
  };
  
  // Функция для перевода категории на русский
  const getCategoryName = (category) => {
    const categories = {
      'beginners': 'Начинающие',
      'teenagers': 'Подростки',
      'adults': 'Взрослые',
      'athletes': 'Спортсмены'
    };
    return categories[category] || category;
  };

  return (
    <div className="group-management">
      <div className="group-header">
        <h2>Управление группами</h2>
        <Link to="/admin/groups/add" className="add-group-button">
          Добавить группу
        </Link>
      </div>
      
      {loading ? (
        <div className="loading-message">Загрузка групп...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : groups.length === 0 ? (
        <div className="empty-message">
          Нет доступных групп. Создайте новую группу.
        </div>
      ) : (
        <div className="groups-table-container">
          <table className="groups-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Участники</th>
                <th>Тренер</th>
                <th>Бассейн</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{getCategoryName(group.category)}</td>
                  <td>
                    {group.member_count} / {group.capacity}
                  </td>
                  <td>{group.coach_name || 'Не назначен'}</td>
                  <td>{group.pool_name || 'Не указан'}</td>
                  <td className="action-buttons">
                    <Link 
                      to={`/admin/groups/${group.id}`}
                      className="view-button"
                    >
                      Просмотр
                    </Link>
                    <Link 
                      to={`/admin/groups/${group.id}/edit`}
                      className="edit-button"
                    >
                      Изменить
                    </Link>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteGroup(group.id)}
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

export default GroupManagement;