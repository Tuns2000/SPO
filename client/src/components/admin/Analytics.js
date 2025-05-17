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
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `http://localhost:3000/api/analytics/${endpoint}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Проверка на случай пустого ответа или ответа с пустым массивом
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        console.log(`Получен пустой ответ для ${endpoint}`);
        setData([]);
        return;
      }
      
      setData(response.data);
    } catch (err) {
      console.error(`Ошибка при загрузке данных для ${endpoint}:`, err);
      
      // Проверяем наличие детального сообщения от сервера
      const errorMessage = err.response?.data?.message || err.response?.data?.details ||
                           'Не удалось загрузить данные';
      
      setError(`${errorMessage}. Проверьте, что все необходимые таблицы созданы в базе данных.`);
      
      // Устанавливаем пустые данные вместо undefined
      setData([]);
    } finally {
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
      return <div className="error-message">{error}</div>;
    }

    switch (activeTab) {
      case 'coaches-by-pools':
        return renderCoachesByPools();
      case 'coach-profit-by-pool':
        return renderCoachProfitByPool();
      case 'coaches-for-beginners':
        return renderCoachesForBeginners();
      case 'groups-by-day':
        return renderGroupsByDay();
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

  // Рендеринг прибыли тренеров по бассейнам
  const renderCoachProfitByPool = () => {
    if (!data || data.length === 0) {
      return <div className="no-data">Нет данных о прибыли тренеров</div>;
    }

    // Группировка тренеров по бассейнам для удобства отображения
    const poolsMap = {};
    data.forEach(item => {
      if (!poolsMap[item.pool_id]) {
        poolsMap[item.pool_id] = {
          id: item.pool_id || 'unknown',
          name: item.pool_name || 'Не указан',
          coaches: []
        };
      }
      
      // Безопасное добавление данных с приведением типов
      poolsMap[item.pool_id].coaches.push({
        id: item.coach_id || `unknown-${Math.random().toString(36).substring(7)}`,
        name: item.coach_name || 'Не указан',
        profit: parseFloat(item.profit || 0)
      });
    });

    return (
      <div className="profit-report">
        <h2>Прибыль тренеров по бассейнам</h2>
        {Object.values(poolsMap).map(pool => (
          <div key={pool.id} className="pool-item">
            <h3>{pool.name}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Тренер</th>
                  <th>Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {pool.coaches.map(coach => (
                  <tr key={coach.id}>
                    <td>{coach.name}</td>
                    <td>{coach.profit.toFixed(2)} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  // Рендеринг тренеров для начинающих
  const renderCoachesForBeginners = () => {
    if (!data || data.length === 0) {
      return <div className="no-data">Нет тренеров для начинающих</div>;
    }

    return (
      <div className="beginners-coaches">
        <h2>Тренеры для начинающих</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Специализация</th>
              <th>Опыт</th>
              <th>Бассейн</th>
            </tr>
          </thead>
          <tbody>
            {data.map(coach => (
              <tr key={coach.id}>
                <td>{coach.name}</td>
                <td>{coach.specialty || "Не указана"}</td>
                <td>{coach.experience ? `${coach.experience} лет` : "Не указан"}</td>
                <td>{coach.pool_name || "Не указан"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Рендеринг групп по дням недели
  const renderGroupsByDay = () => {
    if (!data || data.length === 0) {
      return <div className="no-data">Нет данных о группах</div>;
    }

    // Группировка данных по бассейнам для удобства отображения
    const poolsMap = {};
    data.forEach(item => {
      if (!poolsMap[item.pool_id]) {
        poolsMap[item.pool_id] = {
          id: item.pool_id,
          name: item.pool_name,
          days: {}
        };
      }
      
      const dayNumber = parseFloat(item.day_of_week);
      const dayName = getDayName(dayNumber);
      
      poolsMap[item.pool_id].days[dayNumber] = {
        name: dayName,
        count: item.group_count
      };
    });

    return (
      <div className="groups-by-day">
        <h2>Количество групп по дням недели</h2>
        {Object.values(poolsMap).map(pool => (
          <div key={pool.id} className="pool-item">
            <h3>{pool.name}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>День недели</th>
                  <th>Количество групп</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5, 6].map(dayNumber => (
                  <tr key={dayNumber}>
                    <td>{getDayName(dayNumber)}</td>
                    <td>{pool.days[dayNumber]?.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  // Рендеринг бассейна с максимальной выручкой
  const renderTopProfitPool = () => {
    if (!data || !Object.keys(data).length) {
      return <div className="no-data">Нет данных о прибыльности бассейнов</div>;
    }

    return (
      <div className="top-pool">
        <h2>Бассейн с максимальной выручкой</h2>
        <div className="top-pool-info">
          <h3>{data.name}</h3>
          <p>{data.address}</p>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Общая выручка:</span>
              {/* Здесь нужно добавить проверку перед вызовом toFixed */}
              <span className="stat-value">{(data.total_revenue !== undefined ? Number(data.total_revenue) : 0).toFixed(2)} ₽</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Количество абонементов:</span>
              <span className="stat-value">{data.subscription_count || 0}</span>
            </div>
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
            className={activeTab === 'coach-profit-by-pool' ? 'active' : ''}
            onClick={() => setActiveTab('coach-profit-by-pool')}
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