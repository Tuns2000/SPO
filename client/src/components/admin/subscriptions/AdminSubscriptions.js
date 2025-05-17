import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminSubscriptions.css';

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await axios.get('http://localhost:3000/api/admin/subscriptions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSubscriptions(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке абонементов:', err);
        setError('Не удалось загрузить список абонементов');
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const getStatusClass = (active, endDate) => {
    if (!active) return 'status-cancelled';
    
    const now = new Date();
    const end = new Date(endDate);
    
    if (end < now) return 'status-expired';
    return 'status-active';
  };

  return (
    <div className="admin-subscriptions">
      <h2>Управление абонементами</h2>
      
      {loading ? (
        <p className="loading">Загрузка абонементов...</p>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="subscriptions-list">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Тип</th>
                <th>Цена</th>
                <th>Начало</th>
                <th>Окончание</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => (
                <tr key={sub.id}>
                  <td>{sub.id}</td>
                  <td>{sub.user_name || 'Нет данных'}</td>
                  <td>{sub.type}</td>
                  <td>{sub.price} ₽</td>
                  <td>{new Date(sub.start_date).toLocaleDateString()}</td>
                  <td>{new Date(sub.end_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(sub.active, sub.end_date)}`}>
                      {!sub.active ? 'Отменен' : new Date(sub.end_date) < new Date() ? 'Истек' : 'Активен'}
                    </span>
                  </td>
                  <td>
                    <button className="edit-btn">Редактировать</button>
                    <button className="delete-btn">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;