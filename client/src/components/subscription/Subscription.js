import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Subscription.css';

const Subscription = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedType, setSelectedType] = useState('monthly');
  const [purchaseMessage, setPurchaseMessage] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // Проверка авторизации
  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { redirectTo: '/subscription' } });
    }
  }, [token, navigate]);
  
  // Загрузка абонементов пользователя
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get('http://localhost:3000/api/subscription/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSubscriptions(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке абонементов:', err);
        setError(err.response?.data?.error || 'Не удалось загрузить абонементы');
        setLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, [token]);
  
  // Обработчик покупки абонемента
  const handlePurchase = async () => {
    setPurchasing(true);
    setPurchaseMessage(null);
    
    try {
      const response = await axios.post(
        'http://localhost:3000/api/subscription',
        { type: selectedType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Добавляем новый абонемент в список
      setSubscriptions(prevSubscriptions => [response.data.subscription, ...prevSubscriptions]);
      
      setPurchaseMessage({
        type: 'success',
        text: 'Абонемент успешно оформлен!'
      });
      
    } catch (err) {
      console.error('Ошибка при покупке абонемента:', err);
      setPurchaseMessage({
        type: 'error',
        text: err.response?.data?.error || 'Произошла ошибка при оформлении абонемента'
      });
    } finally {
      setPurchasing(false);
    }
  };
  
  // Проверка активного абонемента
  const hasActiveSubscription = subscriptions.some(
    sub => sub.active && new Date(sub.end_date) > new Date()
  );
  
  if (!token) {
    return null; // Перенаправление выполняется в useEffect
  }
  
  if (loading) {
    return (
      <div className="subscription-container">
        <h2>Мои абонементы</h2>
        <p>Загрузка...</p>
      </div>
    );
  }
  
  return (
    <div className="subscription-container">
      <h2>Управление абонементами</h2>
      
      <div className="subscription-sections">
        {/* Секция покупки абонемента */}
        <div className="subscription-purchase-section">
          <h3>Приобрести абонемент</h3>
          
          {purchaseMessage && (
            <div className={`message ${purchaseMessage.type === 'error' ? 'error-message' : 'success-message'}`}>
              {purchaseMessage.text}
            </div>
          )}
          
          <div className="subscription-type-selector">
            <div 
              className={`subscription-type-option ${selectedType === 'single' ? 'selected' : ''}`}
              onClick={() => setSelectedType('single')}
            >
              <h4>Разовое посещение</h4>
              <div className="subscription-price">500 ₽</div>
              <div className="subscription-duration">1 день</div>
            </div>
            
            <div 
              className={`subscription-type-option ${selectedType === 'monthly' ? 'selected' : ''}`}
              onClick={() => setSelectedType('monthly')}
            >
              <h4>Месячный</h4>
              <div className="subscription-price">5000 ₽</div>
              <div className="subscription-duration">30 дней</div>
            </div>
            
            <div 
              className={`subscription-type-option ${selectedType === 'quarterly' ? 'selected' : ''}`}
              onClick={() => setSelectedType('quarterly')}
            >
              <h4>Квартальный</h4>
              <div className="subscription-price">12000 ₽</div>
              <div className="subscription-duration">90 дней</div>
              <div className="subscription-discount">Выгода 20%</div>
            </div>
            
            <div 
              className={`subscription-type-option ${selectedType === 'annual' ? 'selected' : ''}`}
              onClick={() => setSelectedType('annual')}
            >
              <h4>Годовой</h4>
              <div className="subscription-price">40000 ₽</div>
              <div className="subscription-duration">365 дней</div>
              <div className="subscription-discount">Выгода 33%</div>
            </div>
          </div>
          
          <button 
            className="purchase-button"
            onClick={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? 'Оформление...' : 'Оформить абонемент'}
          </button>
        </div>
        
        {/* Секция истории абонементов */}
        <div className="subscription-history-section">
          <h3>Мои абонементы</h3>
          
          {hasActiveSubscription && (
            <div className="active-subscription-badge">
              <span>У вас есть активный абонемент</span>
            </div>
          )}
          
          {subscriptions.length === 0 ? (
            <p className="no-subscriptions">У вас пока нет оформленных абонементов</p>
          ) : (
            <div className="subscription-history">
              {subscriptions.map((subscription, index) => {
                const startDate = new Date(subscription.start_date);
                const endDate = new Date(subscription.end_date);
                const isActive = subscription.active && endDate > new Date();
                
                return (
                  <div className={`subscription-card ${isActive ? 'active' : 'expired'}`} key={index}>
                    <div className="subscription-header">
                      <div className="subscription-type">
                        {subscription.type === 'single' ? 'Разовое посещение' :
                         subscription.type === 'monthly' ? 'Месячный' :
                         subscription.type === 'quarterly' ? 'Квартальный' :
                         subscription.type === 'annual' ? 'Годовой' : subscription.type}
                      </div>
                      <div className="subscription-status">
                        {isActive ? 'Активен' : 'Истёк'}
                      </div>
                    </div>
                    
                    <div className="subscription-dates">
                      <div>
                        <span className="date-label">Начало:</span>
                        <span className="date-value">{startDate.toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="date-label">Окончание:</span>
                        <span className="date-value">{endDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="subscription-price-paid">
                      Стоимость: {subscription.price} ₽
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription;