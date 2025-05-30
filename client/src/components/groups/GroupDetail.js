import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Group.css';

const GroupDetail = () => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState(null);
  
  // Добавляем отдельное состояние для расписания
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  // Функция для загрузки деталей группы
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

  // Отдельная функция для загрузки расписания группы
  const fetchGroupSchedule = async () => {
    if (!id) return;
    
    setScheduleLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/schedule/group/${id}`);
      setSchedule(response.data);
      setScheduleError(null);
    } catch (err) {
      console.error('Ошибка при загрузке расписания группы:', err);
      setScheduleError('Не удалось загрузить расписание занятий');
      // Если расписания нет, устанавливаем пустой массив
      setSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Загрузка деталей группы при первом рендере
  useEffect(() => {
    fetchGroupDetails();
  }, [id]);
  
  // Загрузка расписания группы при первом рендере и запуск интервала обновления
  useEffect(() => {
    // Первичная загрузка расписания
    fetchGroupSchedule();
    
    // Настройка интервала обновления (каждые 30 секунд)
    const scheduleInterval = setInterval(fetchGroupSchedule, 30000);
    
    // Очистка интервала при размонтировании компонента
    return () => clearInterval(scheduleInterval);
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

  const handleEnroll = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post(`http://localhost:3000/api/group/${groupId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Вы успешно записались в группу');
      loadGroupDetails(); // Перезагрузить информацию о группе
      
    } catch (err) {
      console.error('Ошибка при записи в группу:', err);
      
      if (err.response) {
        const errorCode = err.response.data.errorCode;
        
        if (errorCode === 'REMOVED_BY_COACH') {
          alert('Вы не можете записаться в эту группу, так как были исключены тренером');
        } else if (errorCode === 'NO_SUBSCRIPTION') {
          alert('Для записи в группу требуется активный абонемент');
        } else if (errorCode === 'ALREADY_ENROLLED') {
          alert('Вы уже записаны в эту группу');
        } else if (errorCode === 'NO_CAPACITY') {
          alert('В группе нет свободных мест');
        } else {
          alert('Ошибка при записи в группу: ' + (err.response.data.error || 'Неизвестная ошибка'));
        }
      } else {
        alert('Ошибка при записи в группу');
      }
    } finally {
      setLoading(false);
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

  // Функция для получения названия дня недели по номеру
  const getDayOfWeekName = (dayNumber) => {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    return days[dayNumber - 1] || 'Неизвестный день';
  };

  // Измените раздел отображения расписания:
  const renderSchedule = () => {
    if (scheduleLoading && schedule.length === 0) {
      return <p>Загрузка расписания...</p>;
    }
    
    if (scheduleError) {
      return <p className="error-message">{scheduleError}</p>;
    }
    
    if (schedule.length === 0) {
      return <p>Расписание занятий пока не составлено</p>;
    }
    
    return (
      <div className="schedule-list">
        {schedule.map((item) => (
          <div className="schedule-item" key={item.id}>
            <div className="schedule-day">
              {getDayOfWeekName(item.day_of_week)}
            </div>
            <div className="schedule-time">
              {item.start_time?.substr(0, 5) || '00:00'} - 
              {item.end_time?.substr(0, 5) || '00:00'}
            </div>
            <div className="schedule-location">
              {item.pool_name || 'Не указан'}
            </div>
            <div className="schedule-coach">
              Тренер: {item.coach_name || 'Не назначен'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Функция для преобразования кода категории в читаемое название
  const getCategoryName = (category) => {
    const categories = {
      'beginners': 'Начинающие',
      'teenagers': 'Подростки',
      'adults': 'Взрослые',
      'athletes': 'Спортсмены'
    };
    
    return categories[category] || 'Не указана';
  };

  return (
    <div className="group-detail-container">
      <button className="back-button" onClick={() => navigate('/groups')}>
        &larr; Назад к списку групп
      </button>
      
      <div className="group-details-container">
        <h2>{group.name}</h2>
        
        {/* Информация о бассейне */}
        <div className="pool-info-section">
          <h3>Информация о бассейне</h3>
          <div className="pool-info">
            <p><strong>Название:</strong> {group.pool_name || 'Не указано'}</p>
            <p><strong>Адрес:</strong> {group.pool_address || 'Не указан'}</p>
            <p><strong>Тип бассейна:</strong> {getPoolTypeText(group.pool_type)}</p>
            {group.pool_id && (
              <Link to={`/pools/${group.pool_id}`} className="view-pool-button">
                Подробнее о бассейне
              </Link>
            )}
          </div>
        </div>
        
        
          {/* Добавляем отображение категории */}
          <div className="info-item">
            <span className="info-label">Категория:</span>
            <span className="info-value">{getCategoryName(group.category)}</span>
          </div>
          
          
        
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
              {renderSchedule()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

{/* Вспомогательная функция для отображения типа бассейна на русском */}
function getPoolTypeText(type) {
  switch (type) {
    case 'sport': return 'Спортивный';
    case 'health': return 'Оздоровительный';
    case 'combined': return 'Комбинированный';
    default: return type || 'Не указан';
  }
}

export default GroupDetail;