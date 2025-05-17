import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';
import AdminUsers from '../AdminUsers'; // Добавлен импорт
import AdminSchedule from './schedule/schedule';
import AdminGroups from './groups/groups';
import AdminCoaches from './coaches/coaches';
import AdminPools from './pools/pools'; // Добавлен импорт AdminPools
import AdminSubscriptions from './subscriptions/subscriptions'; // Добавлен импорт AdminSubscriptions

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  // Определяем функцию fetchAdminData здесь, чтобы она была доступна всему компоненту
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersRes, statsRes] = await Promise.all([
        axios.get('http://localhost:3000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3000/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке данных администратора:', err);
      setError('Не удалось загрузить данные. Проверьте соединение или перезайдите в систему.');
      setLoading(false);
    }
  };
  
  // Проверка авторизации и роли
  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { redirectTo: '/admin' } });
      return;
    }
    
    if (role !== 'admin') {
      navigate('/');
      return;
    }
  }, [token, role, navigate]);
  
  // Загрузка статистики и данных для админа
  useEffect(() => {
    if (!token || role !== 'admin') return;
    
    fetchAdminData();
  }, [token, role]); // Удалили navigate из зависимостей, так как он не используется в этом эффекте
  
  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <h2>Панель управления</h2>
        <nav className="admin-nav">
          <NavLink to="/admin-dashboard" end>
            Обзор
          </NavLink>
          <NavLink to="/admin-dashboard/users">
            Пользователи
          </NavLink>
          <NavLink to="/admin-dashboard/coaches">
            Тренеры
          </NavLink>
          <NavLink to="/admin-dashboard/groups">
            Группы
          </NavLink>
          <NavLink to="/admin-dashboard/schedule">
            Расписание
          </NavLink>
          <NavLink to="/admin-dashboard/pools">
            Бассейны
          </NavLink>
          <NavLink to="/admin-dashboard/subscriptions">
            Абонементы
          </NavLink>
        </nav>
      </div>
      <div className="admin-content">
        <Routes>
          <Route path="/" element={
            <AdminOverviewComponent 
              loading={loading} 
              error={error} 
              stats={stats} 
              users={users} 
              fetchData={fetchAdminData}
            />
          } />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/coaches" element={<AdminCoaches />} />
          <Route path="/groups" element={<AdminGroups />} />
          <Route path="/schedule" element={<AdminSchedule />} />
          <Route path="/pools" element={<AdminPools />} />
          <Route path="/subscriptions" element={<AdminSubscriptions />} />
        </Routes>
      </div>
    </div>
  );
};

// Переименуйте этот локальный компонент, чтобы избежать конфликта с импортом
const AdminOverviewComponent = ({ loading, error, stats, users, fetchData }) => {
  if (loading) return <div className="loading">Загрузка данных...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const totalUsers = stats.users || 0;  // stats.users уже является числом, а не массивом
  const totalGroups = stats.groups || 0;
  const totalSubscriptions = stats.subscriptions || 0;
  const totalPools = stats.pools || 0;
  const totalEnrollments = stats.enrollments || 0;

  return (
    <div className="admin-overview">
      <h2>Обзор системы</h2>
      
      <button onClick={fetchData} className="refresh-btn">
        Обновить данные
      </button>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Пользователи</h3>
          <div className="stat-count">{totalUsers}</div>
        </div>
        
        <div className="stat-card">
          <h3>Активные абонементы</h3>
          <div className="stat-count">{totalSubscriptions}</div>
        </div>
        
        <div className="stat-card">
          <h3>Группы</h3>
          <div className="stat-count">{totalGroups}</div>
        </div>
        
        <div className="stat-card">
          <h3>Бассейны</h3>
          <div className="stat-count">{totalPools}</div>
        </div>
      </div>
      
      <div className="recent-users">
        <h3>Последние регистрации</h3>
        <table>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 5).map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <Link to="/admin-dashboard/users" className="view-all-link">
          Смотреть всех пользователей
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;