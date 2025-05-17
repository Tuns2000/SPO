import React from 'react';
import { Link } from 'react-router-dom';
import './overview.css';

const AdminOverviewComponent = ({ loading, error, stats, users, fetchData }) => {
  if (loading) return <div className="loading">Загрузка данных...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const totalUsers = stats?.users || 0;
  const totalGroups = stats?.groups || 0;
  const totalSubscriptions = stats?.subscriptions || 0;
  const totalPools = stats?.pools || 0;
  const totalEnrollments = stats?.enrollments || 0;

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
            {users && users.slice(0, 5).map(user => (
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

export default AdminOverviewComponent;