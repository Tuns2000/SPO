import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Group.css';

const GroupDetail = () => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/group/${id}`);
        setGroup(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке информации о группе:', err);
        setError(err.response?.data?.error || 'Не удалось загрузить информацию о группе');
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [id]);

  const handleEnrollment = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { redirectTo: `/groups/${id}` } });
      return;
    }

    setEnrolling(true);
    setEnrollMessage(null);

    try {
      const response = await axios.post(
        `http://localhost:3000/api/group/${id}/enroll`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setEnrollMessage({
        type: 'success',
        text: 'Вы успешно записаны в группу!'
      });
      
      // Обновляем данные группы
      const updatedGroup = await axios.get(`http://localhost:3000/api/group/${id}`);
      setGroup(updatedGroup.data);
    } catch (err) {
      console.error('Ошибка при записи в группу:', err);
      setEnrollMessage({
        type: 'error',
        text: err.response?.data?.error || 'Произошла ошибка при записи в группу'
      });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="group-detail-container">
        <h2>Информация о группе</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-detail-container">
        <h2>Информация о группе</h2>
        <div className="error-message">{error}</div>
        <button className="secondary-button" onClick={() => navigate('/groups')}>
          Вернуться к списку групп
        </button>
      </div>
    );
  }

  return (
    <div className="group-detail-container">
      <button className="back-button" onClick={() => navigate('/groups')}>
        &larr; Назад к списку групп
      </button>
      
      <h2>{group.name}</h2>
      
      <div className="group-detail-info">
        <div className="group-detail-left">
          <div className="info-block">
            <h3>О группе</h3>
            <p className="group-description">{group.description}</p>
            
            <div className="coach-info">
              <h4>Тренер</h4>
              <p><strong>{group.coach_name || 'Не назначен'}</strong></p>
              {group.specialty && <p>Специализация: {group.specialty}</p>}
            </div>
            
            <div className="capacity-info">
              <h4>Вместимость</h4>
              <div className="capacity-display">
                <div className="capacity-text">
                  <span className="capacity-current">{group.enrolled_count}</span>
                  <span className="capacity-slash">/</span>
                  <span className="capacity-total">{group.capacity}</span>
                </div>
                <div className="group-capacity-bar detail-bar">
                  <div 
                    className="group-capacity-filled" 
                    style={{
                      width: `${(group.enrolled_count / group.capacity) * 100}%`,
                      backgroundColor: group.enrolled_count >= group.capacity ? '#e74c3c' : '#3498db'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="enrollment-block">
            {enrollMessage && (
              <div className={`message ${enrollMessage.type === 'error' ? 'error-message' : 'success-message'}`}>
                {enrollMessage.text}
              </div>
            )}
            
            <button 
              className="enroll-button"
              onClick={handleEnrollment}
              disabled={enrolling || parseInt(group.enrolled_count) >= parseInt(group.capacity)}
            >
              {enrolling ? 'Выполняется запись...' : 'Записаться в группу'}
            </button>
            
            {!isAuthenticated && (
              <p className="login-prompt">Для записи в группу необходимо <a href="/login">войти в систему</a></p>
            )}
            
            {parseInt(group.enrolled_count) >= parseInt(group.capacity) && (
              <p className="full-group-message">Группа заполнена. Пожалуйста, выберите другую группу.</p>
            )}
          </div>
        </div>
        
        <div className="group-detail-right">
          <div className="schedule-block">
            <h3>Расписание занятий</h3>
            {group.schedule && group.schedule.length > 0 ? (
              <div className="schedule-list">
                {group.schedule.map((item, index) => {
                  const scheduleDate = new Date(item.date);
                  const formattedDate = scheduleDate.toLocaleDateString('ru-RU', {
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long'
                  });
                  
                  return (
                    <div className="schedule-item" key={index}>
                      <div className="schedule-date">{formattedDate}</div>
                      <div className="schedule-time">{item.time.slice(0, 5)}</div>
                      <div className={`schedule-status status-${item.status}`}>
                        {item.status === 'scheduled' ? 'Запланировано' : 
                         item.status === 'completed' ? 'Проведено' : 
                         item.status === 'cancelled' ? 'Отменено' : item.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>Расписание занятий пока не составлено</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;