import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Profile.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  // Проверка авторизации
  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { redirectTo: '/profile' } });
      return;
    }
    
    const fetchUserData = async () => {
      try {
        // Получение данных профиля пользователя
        const profileResponse = await axios.get('http://localhost:3000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(profileResponse.data);
        
        // Получение абонементов пользователя
        const subscriptionsResponse = await axios.get('http://localhost:3000/api/subscription/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptions(subscriptionsResponse.data);
        
        // Получение групп, в которые записан пользователь
        const enrollmentsResponse = await axios.get('http://localhost:3000/api/user/enrollments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEnrollments(enrollmentsResponse.data);
        
        // Получение уведомлений пользователя
        const notificationsResponse = await axios.get('http://localhost:3000/api/notification/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(notificationsResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных профиля:', err);
        setError('Не удалось загрузить данные профиля');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [token, navigate]);
  
  // Функция отметки уведомления как прочитанное
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`http://localhost:3000/api/notification/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список уведомлений
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId ? {...notification, is_read: true} : notification
        )
      );
    } catch (err) {
      console.error('Ошибка при обновлении статуса уведомления:', err);
    }
  };
  
  if (!token) return null;
  
  if (loading) {
    return (
      <div className="profile-container">
        <h2>Профиль</h2>
        <p>Загрузка данных...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="profile-container">
        <h2>Профиль</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }
  
  // Преобразуем роль в читаемый текст
  const roleText = (() => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'coach': return 'Тренер';
      case 'client': return 'Клиент';
      default: return role || 'Неизвестно';
    }
  })();
  
  // Проверка на наличие активного абонемента
  const hasActiveSubscription = subscriptions.some(
    sub => sub.active && new Date(sub.end_date) > new Date()
  );

  return (
    <div className="profile-container">
      <h2>Профиль пользователя</h2>
      
      <div className="profile-sections">
        {/* Информация о пользователе */}
        <div className="profile-card">
          <div className="profile-header">
            <h3>Личные данные</h3>
          </div>
          <div className="profile-content">
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">Имя:</span>
                <span className="info-value">{profile?.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{profile?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Роль:</span>
                <span className="info-value role-badge">{roleText}</span>
              </div>
            </div>
            
            <div className="profile-actions">
              <button className="profile-button" onClick={() => alert('Функция в разработке')}>
                Изменить профиль
              </button>
            </div>
          </div>
        </div>
        
        {/* Блок с дополнительными действиями в зависимости от роли */}
        <div className="profile-card">
          <div className="profile-header">
            <h3>Управление</h3>
          </div>
          <div className="profile-content">
            {/* Для клиента */}
            {role === 'client' && (
              <div className="role-specific-actions">
                <div className="subscription-status">
                  {hasActiveSubscription ? (
                    <div className="status-active">У вас есть активный абонемент</div>
                  ) : (
                    <div className="status-inactive">У вас нет активного абонемента</div>
                  )}
                </div>
                <Link to="/subscription" className="profile-link-button">
                  Управление абонементами
                </Link>
                <Link to="/groups" className="profile-link-button">
                  Записаться в группу
                </Link>
              </div>
            )}
            
            {/* Для тренера */}
            {role === 'coach' && (
              <div className="role-specific-actions">
                <Link to="/coach-dashboard" className="profile-link-button coach-button">
                  Перейти в панель тренера
                </Link>
                <Link to="/coach-dashboard/schedule" className="profile-link-button">
                  Мое расписание
                </Link>
                <Link to="/coach-dashboard/groups" className="profile-link-button">
                  Мои группы
                </Link>
              </div>
            )}
            
            {/* Для администратора */}
            {role === 'admin' && (
              <div className="role-specific-actions">
                <Link to="/admin-dashboard" className="profile-link-button admin-button">
                  Перейти в панель администратора
                </Link>
                <Link to="/admin-dashboard/users" className="profile-link-button">
                  Управление пользователями
                </Link>
                <Link to="/admin-dashboard/groups" className="profile-link-button">
                  Управление группами
                </Link>
                <Link to="/admin-dashboard/coaches" className="profile-link-button">
                  Управление тренерами
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Записи в группы (для клиентов) */}
        {role === 'client' && enrollments.length > 0 && (
          <div className="profile-card wide-card">
            <div className="profile-header">
              <h3>Мои группы</h3>
            </div>
            <div className="enrollments-list">
              {enrollments.map((enrollment, index) => (
                <div className="enrollment-item" key={index}>
                  <div className="enrollment-info">
                    <div className="enrollment-group">{enrollment.group_name}</div>
                    <div className="enrollment-details">
                      <span>Тренер: {enrollment.coach_name}</span>
                      <span>Дата записи: {new Date(enrollment.enrollment_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link to={`/groups/${enrollment.group_id}`} className="enrollment-view-button">
                    Подробнее
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Уведомления */}
        <div className="profile-card wide-card">
          <div className="profile-header">
            <h3>Уведомления</h3>
          </div>
          <div className="notifications-list">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <div className={`notification-item ${notification.is_read ? 'read' : 'unread'}`} key={index}>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-date">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button 
                      className="mark-read-button"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Прочитано
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-notifications">У вас нет уведомлений</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
