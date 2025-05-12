import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Coach.css';

const CoachDashboard = () => {
  const [groups, setGroups] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  // Проверка авторизации и роли
  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { redirectTo: '/coach' } });
      return;
    }
    
    if (role !== 'coach') {
      navigate('/');
      return;
    }
  }, [token, role, navigate]);
  
  // Получение информации о группах тренера
  useEffect(() => {
    if (!token || role !== 'coach') return;
    
    const fetchData = async () => {
      try {
        // Загрузка групп тренера
        const groupsResponse = await axios.get('http://localhost:3000/api/coach/my/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setGroups(groupsResponse.data);
        
        // Если есть группы, выбираем первую и загружаем её участников
        if (groupsResponse.data.length > 0) {
          setSelectedGroup(groupsResponse.data[0].id);
          
          const membersResponse = await axios.get(`http://localhost:3000/api/group/${groupsResponse.data[0].id}/members`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setGroupMembers(membersResponse.data);
        }
        
        // Загрузка расписания тренера
        const scheduleResponse = await axios.get('http://localhost:3000/api/coach/my/schedule', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSchedule(scheduleResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных тренера:', err);
        setError(err.response?.data?.error || 'Ошибка при загрузке данных');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token, role]);
  
  // Загрузка участников выбранной группы
  const handleGroupChange = async (e) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId);
    
    try {
      const response = await axios.get(`http://localhost:3000/api/group/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGroupMembers(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке участников группы:', err);
    }
  };
  
  // Обновление статуса занятия
  const updateClassStatus = async (scheduleId, newStatus) => {
    try {
      await axios.put(
        `http://localhost:3000/api/schedule/${scheduleId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем локальное состояние расписания
      setSchedule(prevSchedule => prevSchedule.map(item => 
        item.id === scheduleId ? {...item, status: newStatus} : item
      ));
    } catch (err) {
      console.error('Ошибка при обновлении статуса занятия:', err);
      alert('Не удалось обновить статус занятия');
    }
  };
  
  if (!token || role !== 'coach') {
    return null; // Перенаправление выполняется в useEffect
  }
  
  if (loading) {
    return (
      <div className="coach-container">
        <h2>Панель тренера</h2>
        <p>Загрузка данных...</p>
      </div>
    );
  }
  
  // Сортировка занятий по дате
  const sortedSchedule = [...schedule].sort((a, b) => {
    const dateA = new Date(a.date + 'T' + a.time);
    const dateB = new Date(b.date + 'T' + b.time);
    return dateA - dateB;
  });
  
  return (
    <div className="coach-container">
      <h2>Панель тренера</h2>
      
      <div className="coach-sections">
        {/* Секция групп тренера */}
        <div className="coach-section">
          <h3>Мои группы</h3>
          
          {groups.length > 0 ? (
            <>
              <div className="coach-stats">
                <div className="coach-stat-card">
                  <div className="coach-stat-value">{groups.length}</div>
                  <div className="coach-stat-label">Всего групп</div>
                </div>
                <div className="coach-stat-card">
                  <div className="coach-stat-value">
                    {groups.reduce((sum, group) => sum + Number(group.enrolled_count), 0)}
                  </div>
                  <div className="coach-stat-label">Всего учеников</div>
                </div>
                <div className="coach-stat-card">
                  <div className="coach-stat-value">
                    {sortedSchedule.filter(s => 
                      new Date(s.date + 'T' + s.time) >= new Date() && 
                      s.status === 'scheduled'
                    ).length}
                  </div>
                  <div className="coach-stat-label">Предстоящих занятий</div>
                </div>
              </div>
              
              {/* Выбор группы для отображения участников */}
              <div className="group-selector">
                <label htmlFor="group-select">Выберите группу:</label>
                <select 
                  id="group-select" 
                  value={selectedGroup || ''}
                  onChange={handleGroupChange}
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.enrolled_count}/{group.capacity})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Список участников выбранной группы */}
              {selectedGroup && (
                <div className="group-members">
                  <h4>Участники группы</h4>
                  {groupMembers.length > 0 ? (
                    <table className="coach-table">
                      <thead>
                        <tr>
                          <th>Имя</th>
                          <th>Email</th>
                          <th>Дата записи</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupMembers.map((member, index) => (
                          <tr key={index}>
                            <td>{member.name}</td>
                            <td>{member.email}</td>
                            <td>{new Date(member.enrollment_date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">В этой группе пока нет участников.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="empty-message">У вас пока нет групп.</p>
          )}
        </div>
        
        {/* Секция расписания занятий */}
        <div className="coach-section">
          <h3>Расписание занятий</h3>
          
          {sortedSchedule.length > 0 ? (
            <table className="coach-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Группа</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedSchedule.map((item, index) => {
                  const classDate = new Date(item.date + 'T' + item.time);
                  const isPast = classDate < new Date();
                  
                  return (
                    <tr key={index} className={isPast ? 'past-class' : ''}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>{item.time.slice(0, 5)}</td>
                      <td>{item.group_name}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>
                          {item.status === 'scheduled' ? 'Запланировано' : 
                           item.status === 'completed' ? 'Проведено' : 
                           item.status === 'cancelled' ? 'Отменено' : item.status}
                        </span>
                      </td>
                      <td className="action-buttons">
                        {!isPast && item.status === 'scheduled' && (
                          <>
                            <button 
                              onClick={() => updateClassStatus(item.id, 'completed')}
                              className="btn btn-success"
                            >
                              Провести
                            </button>
                            <button 
                              onClick={() => updateClassStatus(item.id, 'cancelled')}
                              className="btn btn-danger"
                            >
                              Отменить
                            </button>
                          </>
                        )}
                        {isPast && item.status === 'scheduled' && (
                          <button 
                            onClick={() => updateClassStatus(item.id, 'completed')}
                            className="btn btn-success"
                          >
                            Отметить как проведенное
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">У вас пока нет запланированных занятий.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachDashboard;