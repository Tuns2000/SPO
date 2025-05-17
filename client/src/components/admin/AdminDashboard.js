import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    subscriptions: 0,
    groups: 0,
    pools: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Загрузка данных...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h2>Обзор системы</h2>
      
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Пользователи</h3>
          <div className="card-value">{stats.users}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>Активные абонементы</h3>
          <div className="card-value">{stats.subscriptions}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>Группы</h3>
          <div className="card-value">{stats.groups}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>Бассейны</h3>
          <div className="card-value">{stats.pools}</div>
        </div>
      </div>
      
      <button className="refresh-button" onClick={() => window.location.reload()}>
        Обновить данные
      </button>
    </div>
  );
}

export default AdminDashboard;