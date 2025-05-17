import React from 'react';
import './AdminPanel.css';
import { Link } from 'react-router-dom';

function AdminPanel() {
  return (
    <div className="admin-panel">
      <h1>Панель управления</h1>
      <div className="admin-menu">
        <ul>
          <li><Link to="/admin">Обзор</Link></li>
          <li><Link to="/admin/users">Пользователи</Link></li>
          <li><Link to="/admin/coaches">Тренеры</Link></li>
          <li><Link to="/admin/groups">Группы</Link></li>
          <li><Link to="/admin/schedule">Расписание</Link></li>
          <li><Link to="/admin/pools">Бассейны</Link></li>
          <li><Link to="/admin/subscriptions">Абонементы</Link></li>
        </ul>
      </div>
    </div>
  );
}

export default AdminPanel;