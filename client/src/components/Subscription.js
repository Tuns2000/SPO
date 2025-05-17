import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Subscription.css';

function Subscription() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // Получаем абонементы пользователя при загрузке
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/subscription/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptions(response.data);
        setLoading(false);
      } catch (err) {
        handleApiError(err, 'Не удалось загрузить абонементы');
        setLoading(false);
      }
    };
    
    if (token) {
      fetchSubscriptions();
    } else {
      setError('Необходимо авторизоваться для просмотра абонементов');
      setLoading(false);
    }
  }, [token]);
  
  // Обработчик оформления абонемента
  const handleSubscribe = async (type) => {
    try {
      setError(null);
      setSuccessMessage('');
      
      // Проверяем, что тип абонемента является одним из допустимых значений
      if (!['single', 'monthly', 'quarterly', 'annual'].includes(type)) {
        setError('Неверный тип абонемента');
        return;
      }
      
      const response = await axios.post('http://localhost:3000/api/subscription', 
        { type }, // Важно! Отправляем объект с полем type
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Добавляем новый абонемент в список
      setSubscriptions([response.data.subscription, ...subscriptions]);
      setSuccessMessage('Абонемент успешно оформлен!');
      
    } catch (err) {
      handleApiError(err, 'Ошибка при оформлении абонемента');
    }
  };
  
  // Обработка ошибок API с учетом истекшего токена
  const handleApiError = (err, defaultMessage) => {
    console.error(err);
    
    // Если токен истек - перенаправляем на страницу входа
    if (err.response?.data?.tokenExpired) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      navigate('/login', { state: { redirectTo: '/subscription', message: 'Сессия истекла, пожалуйста, войдите снова' } });
      return;
    }
    
    // Иначе показываем сообщение об ошибке
    setError(err.response?.data?.error || defaultMessage);
  };
  
  // Форматирование цены
  function formatPrice(price) {
    return price !== null && price !== undefined 
      ? `${price} ₽` 
      : 'Бесплатно';
  }

  // Заменяем функцию isSubscriptionActive на более универсальную функцию для определения статуса
  function getSubscriptionStatus(subscription) {
    // Если напрямую указан статус, используем его
    if (subscription.status) {
      return subscription.status; // 'active', 'suspended', 'canceled', 'expired'
    }
    
    const currentDate = new Date();
    const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
    
    // Если есть прямой флаг is_expired
    if (subscription.is_expired) {
      return 'expired';
    }
    
    // Если дата окончания в прошлом
    if (endDate && endDate < currentDate) {
      return 'expired';
    }
    
    // Если закончились посещения
    if (subscription.visits_left !== null && subscription.visits_left <= 0) {
      return 'expired';
    }
    
    // По умолчанию считаем абонемент активным
    return 'active';
  }

  // Функция для получения текста статуса на русском
  function getStatusText(status) {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'suspended':
        return 'Приостановлен';
      case 'canceled':
        return 'Отменен';
      case 'expired':
        return 'Истек';
      default:
        return 'Неизвестно';
    }
  }

  // Отображение списка абонементов и форм подписки
  return (
    <div className="subscription-container">
      <h1>Абонементы</h1>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="subscription-plans">
        <h2>Оформить абонемент</h2>
        <div className="plans-grid">
          <div className="plan-card">
            <h3>Разовое посещение</h3>
            <p className="plan-price">500 ₽</p>
            <ul className="plan-features">
              <li>Одно посещение</li>
              <li>Доступ ко всем зонам</li>
              <li>Действует 1 день</li>
            </ul>
            <button 
              className="subscribe-button"
              onClick={() => handleSubscribe('single')}
            >
              Оформить
            </button>
          </div>
          
          <div className="plan-card">
            <h3>Месячный</h3>
            <p className="plan-price">5000 ₽</p>
            <ul className="plan-features">
              <li>Два посещения</li>
              <li>Доступ ко всем зонам</li>
              <li>Действует 30 дней</li>
            </ul>
            <button 
              className="subscribe-button"
              onClick={() => handleSubscribe('monthly')}
            >
              Оформить
            </button>
          </div>
          
          <div className="plan-card featured">
            <div className="best-value">Лучшая цена</div>
            <h3>Квартальный</h3>
            <p className="plan-price">12000 ₽</p>
            <ul className="plan-features">
              <li>Три посещения</li>
              <li>Доступ ко всем зонам</li>
              <li>Действует 90 дней</li>
            </ul>
            <button 
              className="subscribe-button"
              onClick={() => handleSubscribe('quarterly')}
            >
              Оформить
            </button>
          </div>
          
          <div className="plan-card">
            <h3>Годовой</h3>
            <p className="plan-price">40000 ₽</p>
            <ul className="plan-features">
              <li>Пять посещения</li>
              <li>Доступ ко всем зонам</li>
              <li>Действует 365 дней</li>
            </ul>
            <button 
              className="subscribe-button"
              onClick={() => handleSubscribe('annual')}
            >
              Оформить
            </button>
          </div>
        </div>
      </div>
      
      <div className="my-subscriptions">
        <h2>Мои абонементы</h2>
        {loading ? (
          <div className="loading">Загрузка абонементов...</div>
        ) : subscriptions.length > 0 ? (
          <div className="subscriptions-list">
            {subscriptions.map(sub => {
              const status = getSubscriptionStatus(sub);
              
              return (
                <div key={sub.id} className={`subscription-item ${status}`}>
                  <div className="subscription-header">
                    <h3>{sub.description || getSubscriptionName(sub.type)}</h3>
                    <span className={`status-badge ${status}`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  <div className="subscription-details">
                    <div className="detail">
                      <span className="label">Начало:</span>
                      <span className="value">{new Date(sub.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Окончание:</span>
                      <span className="value">{new Date(sub.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Стоимость:</span>
                      <span className="value">{formatPrice(sub.price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-subscriptions">
            У вас пока нет оформленных абонементов
          </div>
        )}
      </div>
    </div>
  );
}

// Вспомогательная функция для получения названия абонемента по его типу
function getSubscriptionName(type) {
  switch (type) {
    case 'single':
      return 'Разовое посещение';
    case 'monthly':
      return 'Месячный абонемент';
    case 'quarterly':
      return 'Квартальный абонемент';
    case 'annual':
      return 'Годовой абонемент';
    default:
      return 'Абонемент';
  }
}

export default Subscription;
