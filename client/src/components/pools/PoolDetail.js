import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './PoolDetail.css';

const PoolDetail = () => {
  const { id } = useParams();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  useEffect(() => {
    const fetchPoolDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/pools/${id}`);
        setPool(response.data);
        
        // Загружаем статистику, если пользователь авторизован
        if (token) {
          const statsResponse = await axios.get(
            `http://localhost:3000/api/pools/${id}/stats`, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStats(statsResponse.data);
        }
      } catch (err) {
        console.error("Ошибка при загрузке данных бассейна:", err);
        setError("Не удалось загрузить данные о бассейне");
      } finally {
        setLoading(false);
      }
    };

    fetchPoolDetails();
  }, [id, token]);

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!pool) {
    return <div className="not-found">Бассейн не найден</div>;
  }

  const getPoolTypeText = (type) => {
    switch (type) {
      case 'sport': return 'Спортивный';
      case 'health': return 'Оздоровительный';
      case 'combined': return 'Комбинированный';
      default: return type;
    }
  };

  const getDayName = (dayOfWeek) => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[dayOfWeek] || `День ${dayOfWeek}`;
  };

  return (
    <div className="pool-detail-container">
      <div className="pool-header">
        <h2>{pool.name}</h2>
        <span className="pool-type">{getPoolTypeText(pool.type)}</span>
      </div>
      
      <div className="pool-address">
        <strong>Адрес:</strong> {pool.address}
      </div>
      
      {/* Секция тренеров */}
      <div className="pool-section">
        <h3>Тренеры</h3>
        {pool.coaches && pool.coaches.length > 0 ? (
          <div className="coaches-grid">
            {pool.coaches.map(coach => (
              <div key={coach.id} className="coach-card">
                <h4>{coach.name}</h4>
                <p><strong>Специализация:</strong> {coach.specialty}</p>
                <p><strong>Опыт:</strong> {coach.experience} {coach.experience === 1 ? 'год' : 
                  coach.experience < 5 ? 'года' : 'лет'}</p>
                <p><strong>Рейтинг:</strong> {coach.rating}</p>
                <Link to={`/coaches/${coach.id}`} className="coach-link">Подробнее</Link>
              </div>
            ))}
          </div>
        ) : (
          <p>В этом бассейне пока нет тренеров</p>
        )}
      </div>
      
      {/* Секция групп */}
      <div className="pool-section">
        <h3>Группы</h3>
        {pool.groups && pool.groups.length > 0 ? (
          <div className="groups-grid">
            {pool.groups.map(group => (
              <div key={group.id} className="group-card">
                <h4>{group.name}</h4>
                <p><strong>Категория:</strong> {
                  group.category === 'beginners' ? 'Начинающие' :
                  group.category === 'teenagers' ? 'Подростки' :
                  group.category === 'adults' ? 'Взрослые' :
                  group.category === 'athletes' ? 'Спортсмены' : 
                  group.category
                }</p>
                <p><strong>Тренер:</strong> {group.coach_name}</p>
                <p><strong>Занято мест:</strong> {group.enrolled_count}/{group.capacity}</p>
                <Link to={`/groups/${group.id}`} className="group-link">Подробнее</Link>
              </div>
            ))}
          </div>
        ) : (
          <p>В этом бассейне пока нет групп</p>
        )}
      </div>
      
      {/* Статистика (только для авторизованных пользователей) */}
      {stats && (
        <div className="pool-section">
          <h3>Статистика</h3>
          
          {/* Группы по дням недели */}
          <div className="stats-card">
            <h4>Количество групп по дням недели</h4>
            <div className="days-stats">
              {stats.groups_by_day.map(day => (
                <div key={day.day_of_week} className="day-stats">
                  <div className="day-name">{getDayName(day.day_of_week)}</div>
                  <div className="day-count">{day.group_count}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Выручка по тренерам (только для админа) */}
          {role === 'admin' && (
            <div className="stats-card">
              <h4>Выручка по тренерам</h4>
              <table className="revenue-table">
                <thead>
                  <tr>
                    <th>Тренер</th>
                    <th>Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.coach_revenue.map(coach => (
                    <tr key={coach.coach_id}>
                      <td>{coach.coach_name}</td>
                      <td className="revenue">{coach.revenue} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Общая выручка (только для админа) */}
          {role === 'admin' && (
            <div className="stats-card">
              <h4>Общая выручка</h4>
              <div className="total-revenue">{stats.total_revenue} ₽</div>
            </div>
          )}
        </div>
      )}
      
      {/* Кнопки для админа */}
      {role === 'admin' && (
        <div className="admin-actions">
          <Link to={`/pools/${id}/edit`} className="admin-button edit">Редактировать</Link>
          <Link to={`/pools/${id}/add-group`} className="admin-button add">Добавить группу</Link>
        </div>
      )}
    </div>
  );
};

export default PoolDetail;