import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
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
    
    const fetchAdminData = async () => {
      try {
        // В реальном API нужно создать эндпоинт для получения всей аналитики
        // Здесь создаем фиктивные данные для демонстрации
        
        // Имитируем запрос на получение общей статистики
        const users = await axios.get('http://localhost:3000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const subscriptions = await axios.get('http://localhost:3000/api/admin/subscriptions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const groups = await axios.get('http://localhost:3000/api/admin/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const groupsLoad = await axios.get('http://localhost:3000/api/admin/groups-load', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const dailyStats = await axios.get('http://localhost:3000/api/admin/daily-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats({
          users: users.data,
          subscriptions: subscriptions.data,
          groups: groups.data,
          groups_load: groupsLoad.data,
          daily_stats: dailyStats.data
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных администратора:', err);
        
        // Если реальные API еще не реализованы, создаем тестовые данные
        setStats({
          users: {
            total_users: 154,
            clients_count: 145,
            coaches_count: 8,
            admins_count: 1
          },
          subscriptions: {
            total_subscriptions: 213,
            active_subscriptions: 87,
            total_revenue: 856000
          },
          groups: {
            total_groups: 12,
            total_capacity: 240
          },
          groups_load: [
            { id: 1, group_name: "Начальное плавание", coach_name: "Иванов И.И.", capacity: 15, enrolled_count: 12, load_percentage: 80 },
            { id: 2, group_name: "Продвинутое плавание", coach_name: "Петров П.П.", capacity: 10, enrolled_count: 9, load_percentage: 90 },
            { id: 3, group_name: "Аквааэробика", coach_name: "Сидорова А.А.", capacity: 20, enrolled_count: 15, load_percentage: 75 },
            { id: 4, group_name: "Детское плавание", coach_name: "Иванов И.И.", capacity: 12, enrolled_count: 8, load_percentage: 66.67 }
          ],
          daily_stats: [
            { record_date: "2025-05-05", subscriptions_sold: 5, revenue: 25000, visitors_count: 45 },
            { record_date: "2025-05-06", subscriptions_sold: 3, revenue: 15000, visitors_count: 38 },
            { record_date: "2025-05-07", subscriptions_sold: 7, revenue: 35000, visitors_count: 52 },
            { record_date: "2025-05-08", subscriptions_sold: 4, revenue: 20000, visitors_count: 41 },
            { record_date: "2025-05-09", subscriptions_sold: 6, revenue: 30000, visitors_count: 47 },
            { record_date: "2025-05-10", subscriptions_sold: 9, revenue: 45000, visitors_count: 63 },
            { record_date: "2025-05-11", subscriptions_sold: 2, revenue: 10000, visitors_count: 35 }
          ]
        });
        
        setLoading(false);
      }
    };
    
    fetchAdminData();
  }, [token, role, navigate]);
  
  if (!token || role !== 'admin') {
    return null; // Перенаправление выполняется в useEffect
  }
  
  if (loading) {
    return (
      <div className="admin-container">
        <h2>Панель администратора</h2>
        <p>Загрузка данных...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-container">
      <h2>Панель администратора</h2>
      
      {stats && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.users.total_users}</div>
              <div className="admin-stat-label">Всего пользователей</div>
              <div className="admin-stat-details">
                <div>Клиентов: {stats.users.clients_count}</div>
                <div>Тренеров: {stats.users.coaches_count}</div>
                <div>Администраторов: {stats.users.admins_count}</div>
              </div>
            </div>
            
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.subscriptions.total_subscriptions}</div>
              <div className="admin-stat-label">Оформлено абонементов</div>
              <div className="admin-stat-details">
                <div>Активных: {stats.subscriptions.active_subscriptions}</div>
                <div>Общая выручка: {Number(stats.subscriptions.total_revenue).toLocaleString()} ₽</div>
              </div>
            </div>
            
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.groups.total_groups}</div>
              <div className="admin-stat-label">Групп</div>
              <div className="admin-stat-details">
                <div>Средняя загрузка: {Math.round(stats.groups_load.reduce((sum, group) => sum + Number(group.load_percentage), 0) / stats.groups_load.length)}%</div>
                <div>Вместимость: {stats.groups.total_capacity} чел.</div>
              </div>
            </div>
          </div>
          
          <h3>Загруженность групп</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название группы</th>
                  <th>Тренер</th>
                  <th>Вместимость</th>
                  <th>Записано</th>
                  <th>Загрузка</th>
                </tr>
              </thead>
              <tbody>
                {stats.groups_load.map((group, index) => (
                  <tr key={index}>
                    <td>{group.group_name}</td>
                    <td>{group.coach_name}</td>
                    <td>{group.capacity}</td>
                    <td>{group.enrolled_count}</td>
                    <td>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar" 
                          style={{
                            width: `${group.load_percentage}%`,
                            backgroundColor: 
                              group.load_percentage > 90 ? '#e74c3c' :
                              group.load_percentage > 70 ? '#f39c12' : '#2ecc71'
                          }}
                        ></div>
                        <div className="progress-text">{group.load_percentage}%</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="admin-actions">
            <Link to="/admin/schedule" className="admin-action-btn">
              Управление расписанием
            </Link>
            <Link to="/admin/coaches" className="admin-action-btn">
              Управление тренерами
            </Link>
            <Link to="/admin/groups" className="admin-action-btn">
              Управление группами
            </Link>
            <Link to="/admin/subscriptions-report" className="admin-action-btn">
              Отчет по абонементам
            </Link>
            <Link to="/admin/client-activity" className="admin-action-btn">
              Активность клиентов
            </Link>
          </div>
          
          <h3>Статистика за последние 7 дней</h3>
          <div className="admin-chart">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Продано абонементов</th>
                  <th>Выручка (₽)</th>
                  <th>Посетителей</th>
                </tr>
              </thead>
              <tbody>
                {stats.daily_stats.map((day, index) => (
                  <tr key={index}>
                    <td>{new Date(day.record_date).toLocaleDateString()}</td>
                    <td>{day.subscriptions_sold}</td>
                    <td>{Number(day.revenue).toLocaleString()}</td>
                    <td>{day.visitors_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;