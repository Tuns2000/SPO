import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './subscriptions.css';

function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
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
  }, [token]);

  // Функция для определения активности абонемента
  const isSubscriptionActive = (subscription) => {
    const currentDate = new Date();
    const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
    
    if (subscription.is_expired) {
      return false;
    }
    
    if (endDate && endDate < currentDate) {
      return false;
    }
    
    if (subscription.status && subscription.status !== 'active') {
      return false;
    }
    
    if (subscription.visits_left !== null && subscription.visits_left <= 0) {
      return false;
    }
    
    return true;
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Бессрочно';
    return new Date(dateString).toLocaleDateString();
  };

  // Функция для отображения названия типа абонемента
  const getSubscriptionTypeName = (type) => {
    switch(type) {
      case 'single': return 'Разовое посещение';
      case 'monthly': return 'Месячный абонемент';
      case 'quarterly': return 'Квартальный абонемент';
      case 'annual': return 'Годовой абонемент';
      default: return type;
    }
  };

  return (
    <div className="admin-subscriptions-container">
      <h2>Управление абонементами</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {loading ? (
        <div className="loading">Загрузка абонементов...</div>
      ) : (
        <div className="table-container">
          <table className="subscriptions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Тип</th>
                <th>Дата начала</th>
                <th>Дата окончания</th>
                <th>Осталось посещений</th>
                <th>Статус</th>
                <th>Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(subscription => {
                const isActive = isSubscriptionActive(subscription);
                
                return (
                  <tr key={subscription.id} className={isActive ? 'active-subscription' : 'expired-subscription'}>
                    <td>{subscription.id}</td>
                    <td>{subscription.name} ({subscription.email})</td>
                    <td>{getSubscriptionTypeName(subscription.type)}</td>
                    <td>{formatDate(subscription.start_date)}</td>
                    <td>{formatDate(subscription.end_date)}</td>
                    <td>{subscription.visits_left !== null ? subscription.visits_left : 'Неограниченно'}</td>
                    <td>
                      <span className={`status-badge ${isActive ? 'active' : 'expired'}`}>
                        {isActive ? 'Активен' : 'Истек'}
                      </span>
                    </td>
                    <td>{subscription.price ? `${subscription.price} ₽` : 'Бесплатно'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminSubscriptions;