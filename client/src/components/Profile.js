import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Profile() {
  const name = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  const [subscriptions, setSubscriptions] = useState([]);
  
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

  if (!name) {
    return (
      <div className="card">
        <h2>Доступ запрещён</h2>
        <p>Вы не авторизованы. Пожалуйста, <Link to="/login">войдите</Link> или <Link to="/register">зарегистрируйтесь</Link>.</p>
      </div>
    );
  }

  const activeSubscription = subscriptions.find(sub => sub.active);

  return (
    <div className="card">
      <h2>Профиль пользователя</h2>
      
      <div className="profile-info" style={{marginBottom: '30px'}}>
        <h3>Здравствуйте, {name}!</h3>
        {activeSubscription ? (
          <p>У вас активен абонемент <strong>"{activeSubscription.type}"</strong> до {new Date(activeSubscription.end_date).toLocaleDateString()}</p>
        ) : (
          <p>У вас нет активных абонементов. <Link to="/subscription">Оформить абонемент</Link></p>
        )}
      </div>
      
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-value">{subscriptions.length}</div>
          <div className="stat-label">Всего абонементов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">12</div>
          <div className="stat-label">Посещений</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">4</div>
          <div className="stat-label">Месяца с нами</div>
        </div>
      </div>
      
      <div style={{marginTop: '30px'}}>
        <h3>Рекомендуемые тренировки</h3>
        <ul className="schedule-list">
          <li className="schedule-item">
            <div className="schedule-info">
              <span className="schedule-group">Свободное плавание</span>
            </div>
            <span className="schedule-time">10:00 - 17:00</span>
            <span className="schedule-coach">Ежедневно</span>
          </li>
          <li className="schedule-item">
            <div className="schedule-info">
              <span className="schedule-group">Аквааэробика</span>
            </div>
            <span className="schedule-time">18:30 - 19:30</span>
            <span className="schedule-coach">Пн, Ср, Пт</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Profile;
