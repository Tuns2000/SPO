import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ScheduleView.css';

const daysOfWeek = [
  { id: 1, name: 'Понедельник' },
  { id: 2, name: 'Вторник' },
  { id: 3, name: 'Среда' },
  { id: 4, name: 'Четверг' },
  { id: 5, name: 'Пятница' },
  { id: 6, name: 'Суббота' },
  { id: 7, name: 'Воскресенье' }
];

function ScheduleView() {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [pools, setPools] = useState([]);
  const [categories, setCategories] = useState([
    { id: 'beginners', name: 'Начинающие' },
    { id: 'teenagers', name: 'Подростки' },
    { id: 'adults', name: 'Взрослые' }, 
    { id: 'athletes', name: 'Спортсмены' }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Фильтры
  const [dayFilter, setDayFilter] = useState('');
  const [poolFilter, setPoolFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [schedulesResponse, poolsResponse] = await Promise.all([
          axios.get('http://localhost:3000/api/schedule'),
          axios.get('http://localhost:3000/api/pools')
        ]);
        
        setSchedules(schedulesResponse.data);
        setFilteredSchedules(schedulesResponse.data);
        setPools(poolsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке расписания:', err);
        setError('Не удалось загрузить расписание. Попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Применение фильтров
  useEffect(() => {
    let filtered = [...schedules];
    
    if (dayFilter) {
      filtered = filtered.filter(item => item.day_of_week === parseInt(dayFilter, 10));
    }
    
    if (poolFilter) {
      filtered = filtered.filter(item => item.pool_id === parseInt(poolFilter, 10));
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredSchedules(filtered);
  }, [dayFilter, poolFilter, categoryFilter, schedules]);
  
  // Сброс фильтров
  const handleClearFilters = () => {
    setDayFilter('');
    setPoolFilter('');
    setCategoryFilter('');
  };
  
  // Запись на занятие
  const handleEnroll = async (scheduleId) => {
    if (!token) {
      alert('Для записи на занятие необходимо авторизоваться');
      return;
    }
    
    try {
      await axios.post(
        `http://localhost:3000/api/schedule/enroll/${scheduleId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Вы успешно записаны на занятие!');
      
      // Обновляем список занятий
      const updatedSchedules = await axios.get('http://localhost:3000/api/schedule');
      setSchedules(updatedSchedules.data);
    } catch (err) {
      console.error('Ошибка при записи на занятие:', err);
      alert(err.response?.data?.error || 'Произошла ошибка при записи на занятие');
    }
  };
  
  const getPoolName = (poolId) => {
    const pool = pools.find(p => p.id === poolId);
    return pool ? pool.name : 'Не указан';
  };
  
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  const getDayName = (dayId) => {
    const day = daysOfWeek.find(d => d.id === dayId);
    return day ? day.name : 'Неизвестно';
  };
  
  // Группировка расписания по дням недели
  const getScheduleByDays = () => {
    const groupedSchedule = {};
    
    filteredSchedules.forEach(item => {
      const dayId = item.day_of_week;
      if (!groupedSchedule[dayId]) {
        groupedSchedule[dayId] = [];
      }
      groupedSchedule[dayId].push(item);
    });
    
    // Сортируем каждую группу занятий по времени начала
    Object.keys(groupedSchedule).forEach(dayId => {
      groupedSchedule[dayId].sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
      });
    });
    
    return groupedSchedule;
  };
  
  const scheduleByDays = getScheduleByDays();
  
  if (loading) {
    return <div className="loading">Загрузка расписания...</div>;
  }
  
  return (
    <div className="schedule-container">
      <h2>Расписание тренировок</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="schedule-filters">
        <div className="filter-group">
          <label>День недели:</label>
          <select 
            value={dayFilter} 
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <option value="">Все дни</option>
            {daysOfWeek.map(day => (
              <option key={day.id} value={day.id}>{day.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Бассейн:</label>
          <select 
            value={poolFilter} 
            onChange={(e) => setPoolFilter(e.target.value)}
          >
            <option value="">Все бассейны</option>
            {pools.map(pool => (
              <option key={pool.id} value={pool.id}>{pool.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Категория:</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Все категории</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        
        <button className="clear-filter-button" onClick={handleClearFilters}>
          Сбросить фильтры
        </button>
      </div>
      
      {filteredSchedules.length === 0 ? (
        <div className="no-schedule">Нет доступных занятий</div>
      ) : (
        <div className="schedule-by-day">
          {Object.keys(scheduleByDays)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(dayId => (
              <div key={dayId} className="day-schedule">
                <h3 className="day-header">{getDayName(parseInt(dayId))}</h3>
                <div className="schedule-items">
                  {scheduleByDays[dayId].map(item => (
                    <div 
                      key={item.id} 
                      className={`schedule-item ${item.status === 'cancelled' ? 'cancelled' : ''}`}
                    >
                      <div className="schedule-time">
                        {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
                      </div>
                      
                      <div className="schedule-details">
                        <div className="schedule-group">{item.group_name}</div>
                        <div className="schedule-category">{getCategoryName(item.category)}</div>
                        <div className="schedule-pool">
                          Бассейн: {item.pool_name}
                        </div>
                        <div className="schedule-coach">
                          Тренер: {item.coach_name || 'Не назначен'}
                        </div>
                        <div className="schedule-occupancy">
                          {item.enrolled_count || 0} / {item.max_participants || '∞'} мест занято
                        </div>
                      </div>
                      
                      <div className="schedule-actions">
                        <button 
                          className="enroll-button"
                          onClick={() => handleEnroll(item.id)}
                          disabled={
                            item.status === 'cancelled' || 
                            (item.max_participants && item.enrolled_count >= item.max_participants)
                          }
                        >
                          Записаться
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default ScheduleView;