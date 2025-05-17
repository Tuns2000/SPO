import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../styles/AdminSchedule.css';

function AdminSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:3000/api/admin/schedule', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        setSchedules(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки расписания:', error);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Загрузка...</div>;
  
  return (
    <div className="admin-schedule">
      <h2>Управление расписанием</h2>
      <button className="add-btn">Добавить занятие</button>
      
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Время</th>
            <th>Группа</th>
            <th>Тренер</th>
            <th>Бассейн</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map(item => (
            <tr key={item.id}>
              <td>{new Date(item.date).toLocaleDateString()}</td>
              <td>{item.time}</td>
              <td>{item.group_name}</td>
              <td>{item.coach_name}</td>
              <td>{item.pool_name}</td>
              <td>
                <button className="edit-btn">Редактировать</button>
                <button className="delete-btn">Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminSchedule;