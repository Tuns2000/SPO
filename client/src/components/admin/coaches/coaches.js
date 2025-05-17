import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../styles/AdminCoaches.css';

function AdminCoaches() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:3000/api/admin/coaches', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        setCoaches(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки тренеров:', error);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Загрузка...</div>;
  
  return (
    <div className="admin-coaches">
      <h2>Управление тренерами</h2>
      <button className="add-btn">Добавить тренера</button>
      
      <table className="coaches-table">
        <thead>
          <tr>
            <th>Имя</th>
            <th>Email</th>
            <th>Специализация</th>
            <th>Опыт</th>
            <th>Рейтинг</th>
            <th>Бассейн</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {coaches.map(coach => (
            <tr key={coach.id}>
              <td>{coach.name}</td>
              <td>{coach.email}</td>
              <td>{coach.specialty || '-'}</td>
              <td>{coach.experience || 0} лет</td>
              <td>{coach.rating || '-'}</td>
              <td>{coach.pool_name || 'Не назначен'}</td>
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

export default AdminCoaches;