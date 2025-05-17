import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import AdminUsers from './AdminUsers';
import AdminOverview from './AdminOverview';
import AdminGroups from './AdminGroups';
import AdminCoaches from './AdminCoaches';
import AdminPools from './AdminPools';
import AdminSubscriptions from './AdminSubscriptions';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  
  // Проверяем, авторизован ли пользователь как админ
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  
  if (!token || userRole !== 'admin') {
    navigate('/login', {
      state: { message: 'Для доступа к панели администратора требуется авторизация' }
    });
    return null;
  }
  
  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <h2>Панель администратора</h2>
        <nav className="admin-nav">
          <NavLink to="/admin-dashboard" end className={({isActive}) => isActive ? "active" : ""}>
            Обзор
          </NavLink>
          <NavLink to="/admin-dashboard/users" className={({isActive}) => isActive ? "active" : ""}>
            Пользователи
          </NavLink>
          <NavLink to="/admin-dashboard/coaches" className={({isActive}) => isActive ? "active" : ""}>
            Тренеры
          </NavLink>
          <NavLink to="/admin-dashboard/groups" className={({isActive}) => isActive ? "active" : ""}>
            Группы
          </NavLink>
          <NavLink to="/admin-dashboard/pools" className={({isActive}) => isActive ? "active" : ""}>
            Бассейны
          </NavLink>
          <NavLink to="/admin-dashboard/subscriptions" className={({isActive}) => isActive ? "active" : ""}>
            Абонементы
          </NavLink>
        </nav>
      </div>
      <div className="admin-content">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/coaches" element={<AdminCoaches />} />
          <Route path="/groups" element={<AdminGroups />} />
          <Route path="/pools" element={<AdminPools />} />
          <Route path="/subscriptions" element={<AdminSubscriptions />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminDashboard;