import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminCoaches.css';

const AdminCoaches = () => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [pools, setPools] = useState([]);
  
  // Состояния для модального окна редактирования
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [formData, setFormData] = useState({
    specialty: '',
    experience: '',
    description: '',
    pool_id: ''
  });
  
  // Состояние для подтверждения удаления
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [coachToDelete, setCoachToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [token]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Получаем тренеров
      const coachesResponse = await axios.get('http://localhost:3000/api/admin/coaches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCoaches(coachesResponse.data);
      
      // Получаем список пользователей и бассейнов для формы добавления
      const usersResponse = await axios.get('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Отфильтровываем только пользователей, не являющихся тренерами
      const nonCoachUsers = usersResponse.data.filter(user => user.role !== 'coach');
      setUsers(nonCoachUsers);
      
      const poolsResponse = await axios.get('http://localhost:3000/api/pools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPools(poolsResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Не удалось загрузить данные тренеров');
      setLoading(false);
    }
  };
  
  // Обработчик для открытия модального окна редактирования
  const handleEditClick = (coach) => {
    setEditingCoach(coach);
    setFormData({
      specialty: coach.specialty || '',
      experience: coach.experience || 0,
      description: coach.description || '',
      pool_id: coach.pool_id || ''
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
        `http://localhost:3000/api/admin/coaches/${editingCoach.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список тренеров
      setCoaches(prevCoaches => 
        prevCoaches.map(coach => 
          coach.id === editingCoach.id ? { ...coach, ...response.data.coach } : coach
        )
      );
      
      setSuccessMessage('Тренер успешно обновлен');
      setIsEditModalOpen(false);
      
      // Обновляем данные после небольшой задержки
      setTimeout(() => {
        fetchData();
        setSuccessMessage('');
      }, 2000);
      
    } catch (err) {
      console.error('Ошибка при обновлении тренера:', err);
      setError('Не удалось обновить информацию о тренере');
    }
  };
  
  // Обработчик для открытия окна подтверждения удаления
  const handleDeleteClick = (coach) => {
    setCoachToDelete(coach);
    setDeleteConfirmOpen(true);
  };
  
  // Обработчик для удаления тренера
  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:3000/api/admin/coaches/${coachToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список тренеров
      setCoaches(prevCoaches => prevCoaches.filter(coach => coach.id !== coachToDelete.id));
      
      setSuccessMessage('Тренер успешно удален');
      setDeleteConfirmOpen(false);
      
      // Скрываем сообщение об успехе через 2 секунды
      setTimeout(() => setSuccessMessage(''), 2000);
      
    } catch (err) {
      console.error('Ошибка при удалении тренера:', err);
      setError('Не удалось удалить тренера. Возможно, у него есть связанные группы.');
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="admin-coaches">
      <h2>Управление тренерами</h2>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {loading ? (
        <p>Загрузка данных...</p>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="coaches-list">
            <h3>Существующие тренеры</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Специализация</th>
                  <th>Опыт</th>
                  <th>Рейтинг</th>
                  <th>Бассейн</th>
                  <th>Группы</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map(coach => (
                  <tr key={coach.id}>
                    <td>{coach.id}</td>
                    <td>{coach.name}</td>
                    <td>{coach.email}</td>
                    <td>{coach.specialty}</td>
                    <td>{coach.experience} лет</td>
                    <td>{coach.rating}</td>
                    <td>{coach.pool_name || 'Не назначен'}</td>
                    <td>{coach.groups_count}</td>
                    <td>
                      <button 
                        className="edit-btn"
                        onClick={() => handleEditClick(coach)}
                      >
                        Редактировать
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteClick(coach)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="add-coach-form">
            <h3>Создать тренера</h3>
            {/* Форма создания тренера здесь */}
          </div>
        </>
      )}
      
      {/* Модальное окно редактирования тренера */}
      {isEditModalOpen && editingCoach && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Редактирование тренера</h3>
            <form onSubmit={handleSubmitEdit}>
              <div className="form-group">
                <label>Имя:</label>
                <input 
                  type="text" 
                  value={editingCoach.name} 
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input 
                  type="email" 
                  value={editingCoach.email} 
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label>Специализация:</label>
                <input 
                  type="text" 
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Опыт (лет):</label>
                <input 
                  type="number" 
                  name="experience"
                  min="0"
                  value={formData.experience}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Описание:</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Бассейн:</label>
                <select 
                  name="pool_id"
                  value={formData.pool_id}
                  onChange={handleInputChange}
                >
                  <option value="">Не назначен</option>
                  {pools.map(pool => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
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
      {deleteConfirmOpen && coachToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm">
            <h3>Подтверждение удаления</h3>
            <p>
              Вы действительно хотите удалить тренера "{coachToDelete.name}"? 
              {coachToDelete.groups_count > 0 && (
                <strong> У этого тренера есть {coachToDelete.groups_count} групп(ы)!</strong>
              )}
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

export default AdminCoaches;