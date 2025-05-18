import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/Analytics.css';

function Analytics() {
  const [activeTab, setActiveTab] = useState('coaches-by-pools');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCoachId, setSelectedCoachId] = useState(null);
  const [coachUsers, setCoachUsers] = useState([]);

  const token = localStorage.getItem('token');

  // Получение данных в зависимости от активной вкладки
  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  // Получение данных с сервера
  const fetchData = async (endpoint) => {
    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`http://localhost:3000/api/analytics/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Проверяем, что данные соответствуют ожидаемому типу
      if (endpoint === 'coaches-for-beginners' || endpoint === 'groups-by-day') {
        if (!Array.isArray(response.data)) {
          console.warn(`Неожиданный формат данных от ${endpoint}:`, response.data);
          setData([]);
        } else {
          setData(response.data);
        }
      } else {
        setData(response.data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error(`Ошибка при загрузке данных (${endpoint}):`, err);
      setError(`Не удалось загрузить данные: ${err.message}`);
      
      // В случае ошибки устанавливаем пустой массив для нужных эндпоинтов
      if (endpoint === 'coaches-for-beginners' || endpoint === 'groups-by-day') {
        setData([]);
      } else {
        setData(null);
      }
      
      setLoading(false);
    }
  };

  // Получение списка посетителей для выбранного тренера
  const fetchCoachUsers = async (coachId) => {
    setSelectedCoachId(coachId);
    setLoading(true);
    
    try {
      const response = await axios.get(
        `http://localhost:3000/api/analytics/coach/${coachId}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCoachUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось загрузить данные о клиентах');
    } finally {
      setLoading(false);
    }
  };

  // Преобразование дня недели в текстовое название
  const getDayName = (dayNumber) => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[dayNumber];
  };

  // Рендеринг разного контента в зависимости от выбранной вкладки
  const renderContent = () => {
    if (loading) {
      return <div className="loading">Загрузка данных...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    switch (activeTab) {
      case 'coaches-by-pools':
        return renderCoachesByPools();
      case 'coach-profit':
        return renderCoachProfit();
      case 'coaches-for-beginners':
        return Array.isArray(data) 
          ? renderCoachesForBeginners(data) 
          : renderCoachesForBeginners([]);
      case 'groups-by-day':
        return Array.isArray(data) 
          ? renderGroupsByDay(data) 
          : renderGroupsByDay([]);
      case 'top-profit-pool':
        return renderTopProfitPool();
      default:
        return <div>Выберите отчет из меню слева</div>;
    }
  };

  // Рендеринг списка тренеров по бассейнам
  const renderCoachesByPools = () => {
    if (!data) {
      return <div className="no-data">Загрузка данных...</div>;
    }

    // Проверяем структуру данных - является ли data массивом
    if (!Array.isArray(data)) {
      console.error('Ожидался массив, получено:', typeof data, data);
      return <div className="no-data">Некорректный формат данных</div>;
    }

    if (data.length === 0) {
      return <div className="no-data">Нет данных о тренерах и бассейнах</div>;
    }

    return (
      <div className="pools-list">
        <h2>Список тренеров по бассейнам</h2>
        {data.map(pool => (
          <div key={pool.pool_id || Math.random()} className="pool-item">
            <h3>{pool.pool_name || "Бассейн без названия"}</h3>
            {pool.coaches && Array.isArray(pool.coaches) && pool.coaches.some(coach => coach !== null) ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Специализация</th>
                    <th>Опыт</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.coaches
                    .filter(coach => coach !== null)
                    .map(coach => (
                      <tr key={coach.id || Math.random()}>
                        <td>{coach.name || "Не указано"}</td>
                        <td>{coach.specialty || "Не указана"}</td>
                        <td>{coach.experience || 0} лет</td>
                        <td>
                          <button onClick={() => fetchCoachUsers(coach.id)}>
                            Клиенты
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            ) : (
              <p>В этом бассейне нет тренеров</p>
            )}
          </div>
        ))}

        {/* Модальное окно для отображения клиентов тренера */}
        {selectedCoachId && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Клиенты тренера</h2>
                <button onClick={() => setSelectedCoachId(null)}>✕</button>
              </div>
              <div className="modal-body">
                {coachUsers.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.name || "Не указано"}</td>
                          <td>{user.email || "Не указан"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>У этого тренера нет клиентов</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Обновляем функцию для отображения прибыли тренеров
  const renderCoachProfit = () => {
    if (!data || !Array.isArray(data)) {
      return <div className="no-data">Загрузка данных о прибыли тренеров...</div>;
    }

    if (data.length === 0) {
      return <div className="no-data">Нет данных о прибыли тренеров</div>;
    }

    return (
      <div className="coach-profit">
        <h2>Прибыль тренеров</h2>
        
        <table className="analytics-table">
          <thead>
            <tr>
              <th>ФИО тренера</th>
              <th>Бассейн</th>
              <th>Специализация</th>
              <th>Опыт</th>
              <th>Кол-во групп</th>
              <th>Кол-во учеников</th>
              <th>Выручка</th>
              <th>Прибыль (40%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((coach, index) => (
              <tr key={coach.coach_id || index}>
                <td>{coach.coach_name}</td>
                <td>{coach.pool_name || "—"}</td>
                <td>{coach.specialty || "—"}</td>
                <td>{coach.experience ? `${coach.experience} лет` : "—"}</td>
                <td className="numeric">{coach.group_count || 0}</td>
                <td className="numeric">{coach.student_count || 0}</td>
                <td className="numeric">
                  {Number(coach.revenue).toLocaleString('ru-RU')} ₽
                </td>
                <td className="profit">
                  {Number(coach.profit).toLocaleString('ru-RU')} ₽
                  <div 
                    className="profit-bar" 
                    style={{
                      width: `${Math.min((coach.profit / data[0].profit) * 100, 100)}%`
                    }}
                  ></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="explanation">
          
        </div>
      </div>
    );
  };

  // Рендеринг тренеров для начинающих
  const renderCoachesForBeginners = (data) => {
    // Проверка на массив
    if (!data || !Array.isArray(data)) {
      console.error('Ожидался массив в renderCoachesForBeginners, получено:', typeof data, data);
      return <div className="no-data">Данные недоступны или имеют неверный формат</div>;
    }
    
    if (data.length === 0) {
      return <div className="no-data">Нет данных о тренерах для начинающих</div>;
    }

    return (
      <div className="coaches-beginners">
        <h2>Тренеры для начинающих</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Специализация</th>
              <th>Опыт</th>
              <th>Бассейн</th>
              {data[0].group_names !== undefined && <th>Группы</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((coach, index) => (
              <tr key={coach.id || index}>
                <td>{coach.name || "Не указано"}</td>
                <td>{coach.specialty || "Не указана"}</td>
                <td>{coach.experience || 0} лет</td>
                <td>{coach.pool_name || "Не указан"}</td>
                {coach.group_names !== undefined && <td>{coach.group_names}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Рендеринг групп по дням недели
  const renderGroupsByDay = (data) => {
    if (!data || !Array.isArray(data)) {
      console.error('Ожидался массив в renderGroupsByDay, получено:', typeof data, data);
      return <div className="no-data">Данные недоступны или имеют неверный формат</div>;
    }
    
    if (data.length === 0) {
      return <div className="no-data">Нет данных о группах по дням недели</div>;
    }

    // Группируем данные по бассейнам
    const poolsMap = {};
    data.forEach(item => {
      if (!poolsMap[item.pool_name]) {
        poolsMap[item.pool_name] = {
          pool_id: item.pool_id,
          name: item.pool_name,
          days: {}
        };
      }
      
      // day_of_week: 1 (Пн) - 7 (Вс)
      poolsMap[item.pool_name].days[item.day_of_week] = item.group_count;
    });

    // Определение названий дней недели
    const dayNames = {
      1: 'Понедельник',
      2: 'Вторник',
      3: 'Среда',
      4: 'Четверг',
      5: 'Пятница',
      6: 'Суббота',
      7: 'Воскресенье'
    };
    
    // Сортировка дней недели для правильного отображения
    const sortedDays = [1, 2, 3, 4, 5, 6, 7];

    return (
      <div className="analytics-section">
        <h2>Количество групп по дням недели</h2>
        
        {Object.keys(poolsMap).length === 0 ? (
          <p>Нет данных для отображения</p>
        ) : (
          Object.values(poolsMap).map((pool, index) => (
            <div key={pool.pool_id || index} className="analytics-pool-item">
              <h3>{pool.name}</h3>
              
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>День недели</th>
                    <th>Количество групп</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDays.map(day => (
                    <tr key={day} className={pool.days[day] > 0 ? 'has-groups' : ''}>
                      <td>{dayNames[day]}</td>
                      <td className="groups-count">
                        {pool.days[day] || 0}
                        {pool.days[day] > 0 && (
                          <div className="bar-indicator" style={{
                            width: `${Math.min(pool.days[day] * 20, 100)}%`,
                            backgroundColor: getBarColor(pool.days[day])
                          }}></div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Всего:</strong></td>
                    <td>
                      <strong>
                        {sortedDays.reduce((sum, day) => sum + (pool.days[day] || 0), 0)} групп
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))
        )}
      </div>
    );
  };

  // Вспомогательная функция для определения цвета индикатора по количеству групп
  const getBarColor = (count) => {
    if (count <= 1) return '#9BE9A8';  // светло-зеленый
    if (count <= 3) return '#40C463';  // зеленый
    if (count <= 5) return '#30A14E';  // темно-зеленый
    return '#216E39';  // очень темно-зеленый
  };

  // Рендеринг бассейна с максимальной выручкой
  const renderTopProfitPool = () => {
    if (!data) {
      return <div className="no-data">Загрузка данных...</div>;
    }

    if (data.name === "Нет данных") {
      return <div className="no-data">Нет данных о бассейнах и абонементах</div>;
    }

    return (
      <div className="top-profit-pool">
        <h2>Бассейн с максимальной выручкой</h2>
        
        <div className="analytics-pool-item">
          <h3>{data.name}</h3>
          
          <div className="pool-details">
            <div className="detail-row">
              <strong>Адрес:</strong>
              <span>{data.address || "Не указан"}</span>
            </div>
            
            <div className="detail-row">
              <strong>Общая выручка:</strong>
              <span className="revenue">{Number(data.total_revenue).toLocaleString('ru-RU')} ₽</span>
            </div>
            
            <div className="detail-row">
              <strong>Количество проданных абонементов:</strong>
              <span>{data.subscription_count}</span>
            </div>
            
            <div className="detail-row">
              <strong>Средняя стоимость абонемента:</strong>
              <span>
                {data.subscription_count > 0 
                  ? Math.round(data.total_revenue / data.subscription_count).toLocaleString('ru-RU')
                  : 0} ₽
              </span>
            </div>
          </div>
          
          <div className="explanation">
           

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-container">
      <div className="sidebar">
        <h2>Отчеты</h2>
        <ul className="nav-menu">
          <li 
            className={activeTab === 'coaches-by-pools' ? 'active' : ''}
            onClick={() => setActiveTab('coaches-by-pools')}
          >
            Тренеры по бассейнам
          </li>
          <li 
            className={activeTab === 'coach-profit' ? 'active' : ''}
            onClick={() => setActiveTab('coach-profit')}
          >
            Прибыль тренеров
          </li>
          <li 
            className={activeTab === 'coaches-for-beginners' ? 'active' : ''}
            onClick={() => setActiveTab('coaches-for-beginners')}
          >
            Тренеры для начинающих
          </li>
          <li 
            className={activeTab === 'groups-by-day' ? 'active' : ''}
            onClick={() => setActiveTab('groups-by-day')}
          >
            Группы по дням недели
          </li>
          <li 
            className={activeTab === 'top-profit-pool' ? 'active' : ''}
            onClick={() => setActiveTab('top-profit-pool')}
          >
            Бассейн с максимальной выручкой
          </li>
        </ul>
      </div>
      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
}

export default Analytics;