import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Импортируем стили
import './Schedule.css';

function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:3000/api/schedule')
      .then(res => {
        setSchedules(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Не удалось загрузить расписание. Пожалуйста, попробуйте позже.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="card">
        <h2>Расписание тренировок</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2>Расписание тренировок</h2>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="schedule-title">Расписание тренировок</h2>
      
      <div className="schedule-cards">
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <div className="schedule-card" key={schedule.id}>
              <div className="schedule-card-info">
                {/* Заменяем строку с датой на день недели */}
                <div className="schedule-card-row">
                  <span className="info-label">День:</span>
                  <span className="info-value">
                    {getDayOfWeekName(schedule.day_of_week)}
                  </span>
                </div>
                
                {/* Добавляем строку с названием группы */}
                <div className="schedule-card-row">
                  <span className="info-label">Группа:</span>
                  <span className="info-value">{schedule.group_name || 'Не указана'}</span>
                </div>
        
                <div className="schedule-card-row">
                  <span className="info-label">Тренер:</span>
                  <span className="info-value">{schedule.coach_name || 'Не назначен'}</span>
                </div>
                
                <div className="schedule-card-row">
                  <span className="info-label">Время:</span>
                  <span className="info-value">
                    {schedule.start_time.substr(0, 5) || '00:00'} - {schedule.end_time.substr(0, 5) || '00:00'}
                  </span>
                </div>
                
                <div className="schedule-card-row">
                  <span className="info-label">Бассейн:</span>
                  <span className="info-value">{schedule.pool_name || 'Не указан'}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>Нет доступных занятий</p>
        )}
      </div>
      
      <div className="card" style={{marginTop: '30px'}}>
        <h2>О нашем бассейне</h2>
        <p>
          Наш современный бассейн предлагает занятия для всех возрастов и уровней подготовки. 
          Профессиональные тренеры помогут вам достичь новых высот в плавании или просто получить удовольствие от водных процедур.
        </p>
        <p>
          Бассейн оснащен современной системой фильтрации и подогрева воды, что обеспечивает комфортное плавание в любое время года.
        </p>
        <p>
          Для регулярных посещений рекомендуем оформить абонемент, что будет значительно выгоднее разовых посещений.
        </p>
      </div>
    </div>
  );
  
  {/* Функция для преобразования номера дня недели в название */}
  function getDayOfWeekName(dayNumber) {
    const days = [
      'Понедельник', 
      'Вторник', 
      'Среда', 
      'Четверг', 
      'Пятница', 
      'Суббота', 
      'Воскресенье'
    ];
    
    // Проверяем, что day_of_week это число от 1 до 7
    if (dayNumber >= 1 && dayNumber <= 7) {
      return days[dayNumber - 1]; // -1 потому что массив начинается с 0
    }
    
    // Если дата доступна, но нет day_of_week, можно вычислить из даты
    if (schedule.date) {
      const date = new Date(schedule.date);
      const day = date.getDay(); // 0 - воскресенье, 1 - понедельник, ...
      return days[(day + 6) % 7]; // Преобразование, чтобы 0 = понедельник
    }
    
    return 'Не указан';
  }
}

export default Schedule;
