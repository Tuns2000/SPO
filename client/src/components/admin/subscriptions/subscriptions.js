import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './subscriptions.css';

function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Добавляем новые состояния для редактирования
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [editFormData, setEditFormData] = useState({
    type: '',
    start_date: '',
    end_date: '',
    visits_left: '',
    status: 'active',
    price: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSubscriptions();
  }, [token]);

  // Выносим получение абонементов в отдельную функцию для переиспользования
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/admin/subscriptions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptions(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке абонементов:', err);
      setError('Не удалось загрузить список абонементов');
      setLoading(false);
    }
  };

  // Функция для определения активности абонемента
  const isSubscriptionActive = (subscription) => {
    const currentDate = new Date();
    const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
    
    if (subscription.is_expired) {
      return false;
    }
    
    if (endDate && endDate < currentDate) {
      return false;
    }
    
    if (subscription.status && subscription.status !== 'active') {
      return false;
    }
    
    if (subscription.visits_left !== null && subscription.visits_left <= 0) {
      return false;
    }
    
    return true;
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Бессрочно';
    return new Date(dateString).toLocaleDateString();
  };

  // Функция для отображения названия типа абонемента
  const getSubscriptionTypeName = (type) => {
    switch(type) {
      case 'single': return 'Разовое посещение';
      case 'monthly': return 'Месячный абонемент';
      case 'quarterly': return 'Квартальный абонемент';
      case 'annual': return 'Годовой абонемент';
      default: return type;
    }
  };
  
  // НОВЫЕ ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ
  
  // Открываем модальное окно редактирования
  const handleEditClick = (subscription) => {
    const formattedStartDate = subscription.start_date ? 
      new Date(subscription.start_date).toISOString().split('T')[0] : '';
    
    const formattedEndDate = subscription.end_date ? 
      new Date(subscription.end_date).toISOString().split('T')[0] : '';
    
    setEditingSubscription(subscription);
    setEditFormData({
      type: subscription.type || '',
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      visits_left: subscription.visits_left !== null ? subscription.visits_left : '',
      status: subscription.status || 'active', // Оставляем оригинальный код статуса
      price: subscription.price || ''
    });
  };
  
  // Обработка изменений полей формы
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    
    // Если изменяется статус, преобразуем его в код
    if (name === 'status') {
      setEditFormData({
        ...editFormData,
        [name]: value // Мы будем хранить код статуса напрямую в select
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value
      });
    }
  };
  
  // Отправка обновленных данных на сервер
  const handleUpdateSubscription = async () => {
    try {
      // Проверяем обязательные поля
      if (!editFormData.type) {
        setError('Тип абонемента обязателен');
        return;
      }
      
      const response = await axios.put(
        `http://localhost:3000/api/subscriptions/${editingSubscription.id}/update`,
        editFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список абонементов
      setSubscriptions(subscriptions.map(sub => 
        sub.id === editingSubscription.id ? response.data : sub
      ));
      
      // Закрываем модальное окно и показываем сообщение об успехе
      setEditingSubscription(null);
      setSuccessMessage('Абонемент успешно обновлен');
      
      // Убираем сообщение через 3 секунды
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // Перезагружаем список для получения актуальных данных
      fetchSubscriptions();
      
    } catch (err) {
      console.error('Ошибка при обновлении абонемента:', err);
      setError(err.response?.data?.message || 'Не удалось обновить абонемент');
      
      // Убираем сообщение об ошибке через 3 секунды
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };
  
  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingSubscription(null);
    setError(null);
  };

  // Находим функцию, отвечающую за отображение статусов
  // Добавляем функцию для преобразования статусов между русским и английским
  const statusMapping = {
    // Из английского в русский (для отображения)
    active: 'Активен',
    suspended: 'Приостановлен',
    expired: 'Истек',
    canceled: 'Отменен',
    
    // Из русского в английский (для обратного преобразования)
    'Активен': 'active',
    'Приостановлен': 'suspended',
    'Истек': 'expired',
    'Отменен': 'canceled'
  };

  // Функция для получения текста статуса на русском
  const getStatusText = (statusCode) => {
    return statusMapping[statusCode] || statusCode;
  };

  // Функция для получения кода статуса на английском
  const getStatusCode = (statusText) => {
    return statusMapping[statusText] || statusText;
  };

  // Заменим функцию отображения класса стиля для статуса
  // Находим участок кода в JSX где отображается статус и меняем его:

  const getStatusClass = (status) => {
    switch(status) {
      case 'active': return 'active';
      case 'suspended': return 'suspended';
      case 'canceled': return 'canceled';
      case 'expired': return 'expired';
      default: return 'expired';
    }
  };

  // Изменяем функцию отрисовки строк таблицы
  const getRowClass = (subscription) => {
    if (subscription.status === 'active') return 'active-subscription';
    if (subscription.status === 'suspended') return 'suspended-subscription';
    if (subscription.status === 'canceled') return 'canceled-subscription';
    return 'expired-subscription';
  };

  return (
    <div className="admin-subscriptions-container">
      <h2>Управление абонементами</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {loading ? (
        <div className="loading">Загрузка абонементов...</div>
      ) : (
        <div className="table-container">
          <table className="subscriptions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Тип</th>
                <th>Дата начала</th>
                <th>Дата окончания</th>
                <th>Осталось посещений</th>
                <th>Статус</th>
                <th>Стоимость</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(subscription => {
                // Вместо просто isActive используем getRowClass для определения класса строки
                const rowClass = getRowClass(subscription);
                
                return (
                  <tr key={subscription.id} className={rowClass}>
                    <td>{subscription.id}</td>
                    <td>{subscription.name} ({subscription.email})</td>
                    <td>{getSubscriptionTypeName(subscription.type)}</td>
                    <td>{formatDate(subscription.start_date)}</td>
                    <td>{formatDate(subscription.end_date)}</td>
                    <td>{subscription.visits_left !== null ? subscription.visits_left : 'Неограниченно'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </td>
                    <td>{subscription.price ? `${subscription.price} ₽` : 'Бесплатно'}</td>
                    <td>
                      <button 
                        className="edit-button"
                        onClick={() => handleEditClick(subscription)}
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Модальное окно редактирования абонемента */}
      {editingSubscription && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3>Редактирование абонемента #{editingSubscription.id}</h3>
            <p className="user-info">
              Пользователь: {editingSubscription.name} ({editingSubscription.email})
            </p>
            
            <div className="form-group">
              <label>Тип абонемента:</label>
              <select 
                name="type" 
                value={editFormData.type}
                onChange={handleEditFormChange}
              >
                <option value="">Выберите тип</option>
                <option value="single">Разовое посещение</option>
                <option value="monthly">Месячный абонемент</option>
                <option value="quarterly">Квартальный абонемент</option>
                <option value="annual">Годовой абонемент</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Дата начала:</label>
              <input 
                type="date" 
                name="start_date" 
                value={editFormData.start_date}
                onChange={handleEditFormChange}
              />
            </div>
            
            <div className="form-group">
              <label>Дата окончания:</label>
              <input 
                type="date" 
                name="end_date" 
                value={editFormData.end_date}
                onChange={handleEditFormChange}
              />
            </div>
            
            <div className="form-group">
              <label>Осталось посещений:</label>
              <input 
                type="number" 
                name="visits_left" 
                value={editFormData.visits_left}
                onChange={handleEditFormChange}
                placeholder="Оставьте пустым для неограниченных посещений"
              />
            </div>
            
            <div className="form-group">
              <label>Статус:</label>
              <select 
                name="status" 
                value={editFormData.status}
                onChange={handleEditFormChange}
              >
                <option value="active">Активен</option>
                <option value="suspended">Приостановлен</option>
                <option value="expired">Истек</option>
                <option value="canceled">Отменен</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Стоимость (₽):</label>
              <input 
                type="number" 
                name="price" 
                value={editFormData.price}
                onChange={handleEditFormChange}
              />
            </div>
            
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancelEdit}>
                Отмена
              </button>
              <button className="save-button" onClick={handleUpdateSubscription}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSubscriptions;