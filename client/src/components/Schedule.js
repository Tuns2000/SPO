import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:3000/api/schedule')
      .then(res => {
        setSchedule(res.data);
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
      <h2>Расписание тренировок</h2>
      {schedule.length > 0 ? (
        <ul className="schedule-list">
          {schedule.map((item, index) => (
            <li key={index} className="schedule-item">
              <div className="schedule-info">
                <span className="schedule-group">{item.group_name}</span>
              </div>
              <span className="schedule-time">{item.time}</span>
              <span className="schedule-coach">Тренер: {item.coach}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Нет доступных занятий</p>
      )}
      
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
}

export default Schedule;
