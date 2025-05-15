import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './MyEnrollments.css';

const MyEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('token');

  // Загрузка записей в группы при монтировании компонента
  useEffect(() => {
    loadEnrollments();
  }, []);

  // Функция для загрузки записей в группы
  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/user/enrollments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEnrollments(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке моих групп:', err);
      setError('Не удалось загрузить ваши записи в группы');
      setLoading(false);
    }
  };

  // Функция отмены записи в группу
  const handleCancelEnrollment = async (groupId) => {
    if (!window.confirm('Вы уверены, что хотите отменить запись в эту группу?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/group/${groupId}/enroll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // После успешной отмены обновляем список групп
      loadEnrollments();
      
      alert('Запись в группу успешно отменена');
    } catch (error) {
      console.error('Ошибка при отмене записи:', error);
      alert('Не удалось отменить запись');
    }
  };

  if (loading) {
    return (
      <div className="my-enrollments-container">
        <h2>Мои группы</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-enrollments-container">
        <h2>Мои группы</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="my-enrollments-container">
      <h2>Мои группы</h2>
      
      {enrollments.length > 0 ? (
        <div className="enrollments-list">
          {enrollments.map(enrollment => (
            <div key={enrollment.group_id} className="enrollment-card">
              <h3>{enrollment.group_name}</h3>
              <div className="enrollment-info">
                <p><strong>Тренер:</strong> {enrollment.coach_name}</p>
                <p><strong>Дата записи:</strong> {enrollment.enrollment_date}</p>
              </div>
              <div className="enrollment-actions">
                <Link to={`/groups/${enrollment.group_id}`} className="enrollment-button">
                  Подробнее
                </Link>
                <button 
                  className="enrollment-button cancel-button"
                  onClick={() => handleCancelEnrollment(enrollment.group_id)}
                >
                  Отменить запись
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-enrollments-message">
          <p>Вы пока не записаны ни в одну группу.</p>
          <Link to="/groups" className="browse-groups-link">
            Просмотреть доступные группы
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyEnrollments;