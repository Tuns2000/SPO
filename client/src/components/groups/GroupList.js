import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Group.css';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/group');
        setGroups(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке групп:', err);
        setError('Не удалось загрузить список групп');
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Функция для удаления группы (только для администраторов)
  const handleDeleteGroup = async (groupId) => {
    if (!token || role !== 'admin') {
      alert('У вас нет прав для удаления группы');
      return;
    }
    
    if (!window.confirm('Вы уверены, что хотите удалить эту группу?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список групп
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      alert(err.response?.data?.error || 'Произошла ошибка при удалении группы');
    }
  };

  if (loading) {
    return (
      <div className="groups-container">
        <h2>Группы</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="groups-container">
        <h2>Группы</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }
  
  // Проверка наличия административных прав
  const isAdmin = role === 'admin';

  return (
    <div className="groups-container">
      <div className="groups-header">
        <h2>Группы для занятий</h2>
        
        {/* Кнопка добавления группы (только для администратора) */}
        {isAdmin && (
          <button 
            className="add-group-button"
            onClick={() => navigate('/admin-dashboard/groups/new')}
          >
            Добавить группу
          </button>
        )}
      </div>
      
      <p>Выберите группу, которая вам подходит. Для записи требуется активный абонемент.</p>
      
      <div className="groups-grid">
        {groups.map(group => (
          <div className="group-card" key={group.id}>
            <h3>{group.name}</h3>
            <div className="group-info">
              <p><strong>Тренер:</strong> {group.coach_name || 'Не назначен'}</p>
              <p><strong>Специализация:</strong> {group.specialty || '-'}</p>
              <p><strong>Занято мест:</strong> {group.enrolled_count}/{group.capacity}</p>
            </div>
            <div className="group-capacity-bar">
              <div 
                className="group-capacity-filled" 
                style={{
                  width: `${(group.enrolled_count / group.capacity) * 100}%`,
                  backgroundColor: group.enrolled_count >= group.capacity ? '#e74c3c' : '#3498db'
                }}
              ></div>
            </div>
            <p className="group-description">{group.description}</p>
            
            <div className="group-actions">
              {/* Кнопка просмотра для всех пользователей */}
              <Link to={`/groups/${group.id}`} className="group-button">
                Подробнее
              </Link>
              
              {/* Кнопка записи в группу (только для авторизованных клиентов) */}
              {token && role === 'client' && (
                <Link to={`/groups/${group.id}`} className="group-button enroll-button">
                  Записаться
                </Link>
              )}
              
              {/* Кнопки для тренера */}
              {token && role === 'coach' && group.coach_id && (
                <Link to={`/coach-dashboard/groups/${group.id}`} className="group-button coach-button">
                  Управление
                </Link>
              )}
              
              {/* Кнопки для администратора */}
              {isAdmin && (
                <>
                  <Link to={`/admin-dashboard/groups/${group.id}/edit`} className="group-button admin-edit-button">
                    Изменить
                  </Link>
                  <button 
                    className="group-button admin-delete-button"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {groups.length === 0 && (
        <div className="no-groups-message">
          <p>В данный момент нет доступных групп.</p>
          {isAdmin && (
            <p>Как администратор, вы можете создать новые группы.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupList;