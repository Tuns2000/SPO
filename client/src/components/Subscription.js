import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Subscription() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    if (token) {
      axios.get('http://localhost:3000/api/subscription/my', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setSubscriptions(res.data);
        })
        .catch(err => console.error(err));
    }
  }, [token]);

  const handleSubscribe = (type, price) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    axios.post('http://localhost:3000/api/subscription', 
      { type, price },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => {
        setSuccess('Абонемент успешно оформлен!');
        // Обновляем список абонементов
        return axios.get('http://localhost:3000/api/subscription/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(res => {
        setSubscriptions(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Ошибка при оформлении абонемента');
        setLoading(false);
      });
  };

  return (
    <>
      <div className="card">
        <h2>Абонементы</h2>
        {error && <div className="error-message" style={{color: 'red', marginBottom: '15px'}}>{error}</div>}
        {success && <div className="success-message" style={{color: 'green', marginBottom: '15px'}}>{success}</div>}
        
        <div className="subscription-types">
          <div className="subscription-card">
            <div className="subscription-name">Стандарт</div>
            <div className="subscription-price">2 500 ₽</div>
            <ul className="subscription-features">
              <li className="subscription-feature">8 посещений в месяц</li>
              <li className="subscription-feature">Доступ к основному бассейну</li>
              <li className="subscription-feature">Шкафчик для личных вещей</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Стандарт', 2500)} 
              className="btn"
              disabled={loading}
            >
              Оформить
            </button>
          </div>
          
          <div className="subscription-card">
            <div className="subscription-name">Премиум</div>
            <div className="subscription-price">4 000 ₽</div>
            <ul className="subscription-features">
              <li className="subscription-feature">Неограниченные посещения</li>
              <li className="subscription-feature">Доступ ко всем зонам</li>
              <li className="subscription-feature">Бесплатное полотенце</li>
              <li className="subscription-feature">Сауна включена</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Премиум', 4000)} 
              className="btn"
              disabled={loading}
            >
              Оформить
            </button>
          </div>
          
          <div className="subscription-card">
            <div className="subscription-name">Семейный</div>
            <div className="subscription-price">6 500 ₽</div>
            <ul className="subscription-features">
              <li className="subscription-feature">До 4-х человек</li>
              <li className="subscription-feature">Неограниченные посещения</li>
              <li className="subscription-feature">Детская зона</li>
              <li className="subscription-feature">Групповые занятия включены</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Семейный', 6500)} 
              className="btn"
              disabled={loading}
            >
              Оформить
            </button>
          </div>
        </div>
      </div>
      
      {subscriptions.length > 0 && (
        <div className="card">
          <h2>Мои абонементы</h2>
          <ul className="schedule-list">
            {subscriptions.map((sub, index) => (
              <li key={index} className="schedule-item">
                <div className="schedule-info">
                  <span className="schedule-group">{sub.type}</span>
                </div>
                <span className="schedule-time">
                  {new Date(sub.start_date).toLocaleDateString()} - {' '}
                  {new Date(sub.end_date).toLocaleDateString()}
                </span>
                <span className="schedule-coach">{sub.price} ₽</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default Subscription;
