import React from 'react';
import { Link } from 'react-router-dom';
import './AdminSidebar.css';

function AdminSidebar() {
  return (
    <div className="admin-sidebar">
      <h2>Панель управления</h2>
      <nav>
        <ul>
          <li><Link to="/admin">Обзор</Link></li>
          <li><Link to="/admin/users">Пользователи</Link></li>
          <li><Link to="/admin/coaches">Тренеры</Link></li>
          <li><Link to="/admin/groups">Группы</Link></li>
          <li><Link to="/admin/schedule">Расписание</Link></li>
          <li><Link to="/admin/pools">Бассейны</Link></li>
          <li><Link to="/admin/subscriptions">Абонементы</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default AdminSidebar;