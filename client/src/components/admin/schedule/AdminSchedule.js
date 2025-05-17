import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminSchedule.css';

const AdminSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  
  // Состояния для модального окна редактирования
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    group_id: '',
    date: '',
    time: '',
    status: 'active'
  });
  
  // Состояние для подтверждения удаления
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [token]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Получаем расписание
      const scheduleResponse = await axios.get('http://localhost:3000/api/admin/schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSchedules(scheduleResponse.data);
      
      // Получаем список групп для формы добавления
      const groupsResponse = await axios.get('http://localhost:3000/api/admin/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGroups(groupsResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Не удалось загрузить данные расписания');
      setLoading(false);
    }
  };
  
  // Обработчик для открытия модального окна редактирования
  const handleEditClick = (schedule) => {
    setEditingSchedule(schedule);
    
    // Форматируем дату для input type="date"
    const dateObj = new Date(schedule.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    setFormData({
      group_id: schedule.group_id || '',
      date: formattedDate,
      time: schedule.time || '',
      status: schedule.status || 'active'
    });
    setIsEditModalOpen(true);
  };
  
  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Обработчик отправки формы редактирования
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.put(
        `http://localhost:3000/api/admin/schedule/${editingSchedule.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список расписания
      setSchedules(prevSchedules => 
        prevSchedules.map(schedule => 
          schedule.id === editingSchedule.id ? { ...schedule, ...response.data } : schedule
        )
      );
      
      setSuccessMessage('Расписание успешно обновлено');
      setIsEditModalOpen(false);
      
      // Обновляем данные после небольшой задержки
      setTimeout(() => {
        fetchData();
        setSuccessMessage('');
      }, 2000);
      
    } catch (err) {
      console.error('Ошибка при обновлении расписания:', err);
      setError('Не удалось обновить информацию о расписании');
    }
  };
  
  // Обработчик для открытия окна подтверждения удаления
  const handleDeleteClick = (schedule) => {
    setScheduleToDelete(schedule);
    setDeleteConfirmOpen(true);
  };
  
  // Обработчик для удаления занятия из расписания
  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:3000/api/admin/schedule/${scheduleToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список расписания
      setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== scheduleToDelete.id));
      
      setSuccessMessage('Занятие успешно удалено из расписания');
      setDeleteConfirmOpen(false);
      
      // Скрываем сообщение об успехе через 2 секунды
      setTimeout(() => setSuccessMessage(''), 2000);
      
    } catch (err) {
      console.error('Ошибка при удалении занятия из расписания:', err);
      setError('Не удалось удалить занятие из расписания');
      setDeleteConfirmOpen(false);
    }
  };

  // Форматирование времени для отображения
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    if (timeString.includes(':')) {
      return timeString; // Уже в нужном формате
    }
    
    // Если время хранится в другом формате, адаптируйте эту логику
    return timeString;
  };

  // Получение статуса в удобочитаемом виде
  const getStatusName = (status) => {
    const statuses = {
      'active': 'Активно',
      'cancelled': 'Отменено',
      'completed': 'Завершено',
      'pending': 'Ожидается'
    };
    return statuses[status] || status;
  };

  return (
    <div className="admin-schedule">
      <h2>Управление расписанием</h2>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {loading ? (
        <p>Загрузка данных...</p>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="schedule-list">
            <h3>Существующие занятия</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Группа</th>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Тренер</th>
                  <th>Бассейн</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(schedule => (
                  <tr key={schedule.id}>
                    <td>{schedule.id}</td>
                    <td>{schedule.group_name}</td>
                    <td>{new Date(schedule.date).toLocaleDateString()}</td>
                    <td>{formatTime(schedule.time)}</td>
                    <td>{schedule.coach_name}</td>
                    <td>{schedule.pool_name}</td>
                    <td>{getStatusName(schedule.status)}</td>
                    <td>
                      <button 
                        className="edit-btn"
                        onClick={() => handleEditClick(schedule)}
                      >
                        Редактировать
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteClick(schedule)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="add-schedule-form">
            <h3>Добавить новое занятие</h3>
            {/* Форма добавления занятия здесь */}
          </div>
        </>
      )}
      
      {/* Модальное окно редактирования занятия */}
      {isEditModalOpen && editingSchedule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Редактирование занятия</h3>
            <form onSubmit={handleSubmitEdit}>
              <div className="form-group">
                <label>Группа:</label>
                <select 
                  name="group_id"
                  value={formData.group_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} - {group.coach_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Дата:</label>
                <input 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Время:</label>
                <input 
                  type="time" 
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Статус:</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Активно</option>
                  <option value="cancelled">Отменено</option>
                  <option value="completed">Завершено</option>
                  <option value="pending">Ожидается</option>
                </select>
              </div>
              
              <div className="modal-buttons">
                <button type="submit" className="save-btn">Сохранить</button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Диалог подтверждения удаления */}
      {deleteConfirmOpen && scheduleToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm">
            <h3>Подтверждение удаления</h3>
            <p>
              Вы действительно хотите удалить занятие группы "{scheduleToDelete.group_name}" 
              на {new Date(scheduleToDelete.date).toLocaleDateString()} в {formatTime(scheduleToDelete.time)}?
            </p>
            <div className="modal-buttons">
              <button 
                onClick={handleConfirmDelete}
                className="confirm-btn"
              >
                Да, удалить
              </button>
              <button 
                onClick={() => setDeleteConfirmOpen(false)}
                className="cancel-btn"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedule;