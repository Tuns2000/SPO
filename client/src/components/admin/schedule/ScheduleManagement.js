import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import './ScheduleManagement.css';
import AddScheduleForm from './AddScheduleForm';

const ScheduleManagement = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [groups, setGroups] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadSchedule();
    loadGroups();
  }, []);
  
  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/admin/schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSchedule(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка при загрузке расписания:', err);
      setError('Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  };
  
  const loadGroups = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/admin/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGroups(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке групп:', err);
    }
  };
  
  const handleAddSchedule = async (scheduleData) => {
    try {
      await axios.post(
        'http://localhost:3000/api/admin/schedule',
        scheduleData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowAddForm(false);
      loadSchedule();
    } catch (err) {
      console.error('Ошибка при добавлении занятия:', err);
      alert(err.response?.data?.error || 'Ошибка при добавлении занятия');
    }
  };
  
  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/admin/schedule/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список после удаления
      loadSchedule();
    } catch (err) {
      console.error('Ошибка при удалении занятия:', err);
      alert('Не удалось удалить занятие');
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy');
  };
  
  // Группируем занятия по дате
  const groupByDate = () => {
    const grouped = {};
    
    schedule.forEach(item => {
      const dateKey = formatDate(item.date);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    
    // Сортируем занятия внутри каждой группы по времени
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        return a.time.localeCompare(b.time);
      });
    });
    
    return grouped;
  };
  
  const groupedSchedule = groupByDate();

  return (
    <div className="schedule-management">
      <div className="schedule-header">
        <h2>Управление расписанием</h2>
        <button 
          className="add-schedule-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Отмена' : 'Добавить занятие'}
        </button>
      </div>
      
      {showAddForm && (
        <AddScheduleForm 
          groups={groups} 
          onSubmit={handleAddSchedule}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {loading ? (
        <div className="loading-message">Загрузка расписания...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : schedule.length === 0 ? (
        <div className="empty-message">
          Расписание пусто. Добавьте новые занятия.
        </div>
      ) : (
        <div className="schedule-content">
          {Object.keys(groupedSchedule).sort().map(date => (
            <div key={date} className="schedule-day">
              <h3 className="schedule-date">{date}</h3>
              <div className="schedule-items">
                {groupedSchedule[date].map(item => (
                  <div key={item.id} className="schedule-item">
                    <div className="schedule-item-time">{item.time}</div>
                    <div className="schedule-item-info">
                      <div className="group-name">{item.group_name}</div>
                      <div className="coach-name">Тренер: {item.coach_name}</div>
                      <div className="pool-name">Бассейн: {item.pool_name}</div>
                    </div>
                    <div className="schedule-item-actions">
                      <Link 
                        to={`/admin/schedule/${item.id}/edit`}
                        className="edit-button"
                      >
                        Изменить
                      </Link>
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
    </div>
  );
};

export default ScheduleManagement;