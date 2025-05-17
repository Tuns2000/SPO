import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../styles/AdminGroups.css';

function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:3000/api/admin/groups', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        setGroups(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки групп:', error);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Загрузка...</div>;
  
  return (
    <div className="admin-groups">
      <h2>Управление группами</h2>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тренер</th>
            <th>Бассейн</th>
            <th>Вместимость</th>
            <th>Записано</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <tr key={group.id}>
              <td>{group.name}</td>
              <td>{group.coach_name || 'Не назначен'}</td>
              <td>{group.pool_name || 'Не назначен'}</td>
              <td>{group.capacity}</td>
              <td>{group.enrolled_count || 0}</td>
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

export default AdminGroups;