import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './schedule.css';

const daysOfWeek = [
  { id: 1, name: 'Понедельник' },
  { id: 2, name: 'Вторник' },
  { id: 3, name: 'Среда' },
  { id: 4, name: 'Четверг' },
  { id: 5, name: 'Пятница' },
  { id: 6, name: 'Суббота' },
  { id: 7, name: 'Воскресенье' }
];

function AdminSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pools, setPools] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Состояния для фильтров
  const [dayFilter, setDayFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [poolFilter, setPoolFilter] = useState('');
  
  // Состояния для модальных окон
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    group_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    pool_id: '',
    max_participants: 10,
    status: 'active'
  });
  
  const token = localStorage.getItem('token');
  
  // Функция для показа временных уведомлений
  const showTemporaryMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 3000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Запрашиваем данные расписания, групп и бассейнов параллельно
        const [schedulesResponse, groupsResponse, poolsResponse] = await Promise.all([
          axios.get('http://localhost:3000/api/admin/schedule', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:3000/api/admin/groups', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:3000/api/pools', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setSchedules(schedulesResponse.data);
        setFilteredSchedules(schedulesResponse.data);
        setGroups(groupsResponse.data);
        setPools(poolsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Проверьте соединение с сервером.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);
  
  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Если выбирается группа, автоматически устанавливаем бассейн из этой группы
    if (name === 'group_id' && value) {
      const selectedGroup = groups.find(group => group.id === parseInt(value, 10));
      if (selectedGroup && selectedGroup.pool_id) {
        setFormData({
          ...formData,
          [name]: parseInt(value, 10),
          pool_id: selectedGroup.pool_id
        });
        return;
      }
    }
    
    // Правильная обработка значений в зависимости от типа поля
    setFormData({
      ...formData,
      [name]: ['max_participants', 'day_of_week', 'group_id', 'pool_id'].includes(name) && value !== '' 
        ? parseInt(value, 10) 
        : value
    });
  };
  
  // Применение фильтров к расписанию
  useEffect(() => {
    let filtered = [...schedules];
    
    if (dayFilter) {
      filtered = filtered.filter(item => item.day_of_week === parseInt(dayFilter, 10));
    }
    
    if (groupFilter) {
      filtered = filtered.filter(item => item.group_id === parseInt(groupFilter, 10));
    }
    
    if (poolFilter) {
      filtered = filtered.filter(item => item.pool_id === parseInt(poolFilter, 10));
    }
    
    setFilteredSchedules(filtered);
  }, [dayFilter, groupFilter, poolFilter, schedules]);
  
  // Открыть модальное окно для добавления занятия
  const handleAddSchedule = () => {
    setFormData({
      group_id: groups.length > 0 ? groups[0].id : '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      pool_id: '',
      max_participants: 10,
      status: 'active'
    });
    
    // Если у первой группы есть бассейн, устанавливаем его
    if (groups.length > 0 && groups[0].pool_id) {
      setFormData(prev => ({
        ...prev,
        pool_id: groups[0].pool_id
      }));
    }
    
    setShowAddModal(true);
  };
  
  // Открыть модальное окно для редактирования занятия
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      group_id: schedule.group_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.substring(0, 5), // Формат HH:MM
      end_time: schedule.end_time.substring(0, 5),     // Формат HH:MM
      pool_id: schedule.pool_id,
      max_participants: schedule.max_participants || 10,
      status: schedule.status || 'active'
    });
    setShowEditModal(true);
  };
  
  // Сохранить новое занятие
  const handleSaveNewSchedule = async () => {
    try {
      // Валидация времени
      if (formData.start_time >= formData.end_time) {
        showTemporaryMessage('Время начала должно быть раньше времени окончания', true);
        return;
      }
      
      const response = await axios.post(
        'http://localhost:3000/api/admin/schedule',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Добавляем новое занятие в список
      setSchedules([...schedules, response.data]);
      showTemporaryMessage('Занятие успешно добавлено в расписание');
      setShowAddModal(false);
    } catch (err) {
      console.error('Ошибка при создании занятия:', err);
      showTemporaryMessage(err.response?.data?.error || 'Произошла ошибка при создании занятия', true);
    }
  };
  
  // Сохранить изменения в занятии
  const handleUpdateSchedule = async () => {
    try {
      // Валидация времени
      if (formData.start_time >= formData.end_time) {
        showTemporaryMessage('Время начала должно быть раньше времени окончания', true);
        return;
      }
      
      const response = await axios.put(
        `http://localhost:3000/api/admin/schedule/${editingSchedule.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем занятие в списке
      setSchedules(schedules.map(item => 
        item.id === editingSchedule.id ? response.data : item
      ));
      
      showTemporaryMessage('Занятие успешно обновлено');
      setShowEditModal(false);
      setEditingSchedule(null);
    } catch (err) {
      console.error('Ошибка при обновлении занятия:', err);
      showTemporaryMessage(err.response?.data?.error || 'Произошла ошибка при обновлении занятия', true);
    }
  };
  
  // Удалить занятие
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Вы действительно хотите удалить это занятие из расписания?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/admin/schedule/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Удаляем занятие из списка
      setSchedules(schedules.filter(item => item.id !== scheduleId));
      showTemporaryMessage('Занятие успешно удалено из расписания');
    } catch (err) {
      console.error('Ошибка при удалении занятия:', err);
      showTemporaryMessage(err.response?.data?.error || 'Произошла ошибка при удалении занятия', true);
    }
  };
  
  // Сброс фильтров
  const handleClearFilters = () => {
    setDayFilter('');
    setGroupFilter('');
    setPoolFilter('');
  };
  
  // Получить название бассейна по ID
  const getPoolName = (poolId) => {
    const pool = pools.find(p => p.id === poolId);
    return pool ? pool.name : 'Не указан';
  };
  
  // Получить название группы по ID
  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Не указана';
  };
  
  // Получить название дня недели по ID
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
  
  // Отображение карточек расписания
  const renderScheduleCard = (scheduleItem) => {
    // Получаем день недели для определения класса 
    const dayClass = getDayOfWeekClass(scheduleItem.day_of_week);
    
    return (
      <div className={`schedule-card ${dayClass}`} key={scheduleItem.id}>
        <div className="schedule-card-id">{scheduleItem.id}</div>
        <div className="schedule-card-info">
          <div className="schedule-card-row">
            <span className="info-label">Тренер:</span> 
            <span className="info-value">{scheduleItem.coach_name || 'Не назначен'}</span>
          </div>
          <div className="schedule-card-row">
            <span className="info-label">Время:</span> 
            <span className="info-value">
              {scheduleItem.start_time} - {scheduleItem.end_time}
            </span>
          </div>
          <div className="schedule-card-row">
            <span className="info-label">Бассейн:</span> 
            <span className="info-value">{scheduleItem.pool_name || 'Не указан'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Вспомогательная функция для определения класса в зависимости от дня недели
  const getDayOfWeekClass = (dayNumber) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    // Предполагаем, что dayNumber - числа от 1 до 7
    return days[dayNumber - 1] || '';
  };

  if (loading) {
    return <div className="loading">Загрузка данных расписания...</div>;
  }
  
  return (
    <div className="admin-schedule-container">
      <div className="schedule-header">
        <h2>Управление расписанием</h2>
        <button className="add-button" onClick={handleAddSchedule}>
          Добавить занятие
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
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
          <label>Группа:</label>
          <select 
            value={groupFilter} 
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Все группы</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
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
        
        <button className="clear-filter-button" onClick={handleClearFilters}>
          Сбросить фильтры
        </button>
      </div>
      
      {filteredSchedules.length === 0 ? (
        <div className="no-schedule">Расписание не найдено. Создайте занятие.</div>
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
                        <div className="schedule-group">{getGroupName(item.group_id)}</div>
                        <div className="schedule-pool">
                          Бассейн: {getPoolName(item.pool_id)}
                        </div>
                        <div className="schedule-occupancy">
                          Участники: {item.enrolled_count || 0} / {item.max_participants || '∞'}
                        </div>
                        {item.status === 'cancelled' && (
                          <div className="schedule-cancelled">ОТМЕНЕНО</div>
                        )}
                      </div>
                      
                      <div className="schedule-actions">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditSchedule(item)}
                        >
                          Изменить
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteSchedule(item.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
      
      {/* Модальное окно добавления занятия */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Добавление нового занятия</h3>
              <button className="close-button" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Группа:</label>
                <select
                  name="group_id"
                  value={formData.group_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({getPoolName(group.pool_id)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>День недели:</label>
                <select
                  name="day_of_week"
                  value={formData.day_of_week}
                  onChange={handleInputChange}
                  required
                >
                  {daysOfWeek.map(day => (
                    <option key={day.id} value={day.id}>{day.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="time-inputs">
                <div className="form-group">
                  <label>Время начала:</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Время окончания:</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Бассейн:</label>
                <select
                  name="pool_id"
                  value={formData.pool_id}
                  onChange={handleInputChange}
                  disabled={!!formData.group_id}
                >
                  <option value="">Выберите бассейн</option>
                  {pools.map(pool => (
                    <option key={pool.id} value={pool.id}>{pool.name}</option>
                  ))}
                </select>
                {formData.group_id && (
                  <div className="field-note">
                    Бассейн выбран автоматически на основе группы
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Максимальное количество участников:</label>
                <input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>
              
              <div className="form-group">
                <label>Статус:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Активно</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowAddModal(false)}>
                Отмена
              </button>
              <button className="save-button" onClick={handleSaveNewSchedule}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно редактирования занятия */}
      {showEditModal && editingSchedule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Редактирование занятия</h3>
              <button className="close-button" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Группа:</label>
                <select
                  name="group_id"
                  value={formData.group_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({getPoolName(group.pool_id)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>День недели:</label>
                <select
                  name="day_of_week"
                  value={formData.day_of_week}
                  onChange={handleInputChange}
                  required
                >
                  {daysOfWeek.map(day => (
                    <option key={day.id} value={day.id}>{day.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="time-inputs">
                <div className="form-group">
                  <label>Время начала:</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Время окончания:</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Бассейн:</label>
                <select
                  name="pool_id"
                  value={formData.pool_id}
                  onChange={handleInputChange}
                  disabled={!!formData.group_id}
                >
                  <option value="">Выберите бассейн</option>
                  {pools.map(pool => (
                    <option key={pool.id} value={pool.id}>{pool.name}</option>
                  ))}
                </select>
                {formData.group_id && (
                  <div className="field-note">
                    Бассейн выбран автоматически на основе группы
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Максимальное количество участников:</label>
                <input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>
              
              <div className="form-group">
                <label>Статус:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Активно</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowEditModal(false)}>
                Отмена
              </button>
              <button className="save-button" onClick={handleUpdateSchedule}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSchedule;