import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminGroups.css';

const AdminGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [pools, setPools] = useState([]);
  
  // Состояния для модального окна редактирования
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    coach_id: '',
    pool_id: '',
    capacity: 0,
    description: '',
    category: ''
  });
  
  // Состояние для подтверждения удаления
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [token]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Получаем группы
      const groupsResponse = await axios.get('http://localhost:3000/api/admin/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGroups(groupsResponse.data);
      
      // Получаем список тренеров и бассейнов для формы добавления
      const coachesResponse = await axios.get('http://localhost:3000/api/admin/coaches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCoaches(coachesResponse.data);
      
      const poolsResponse = await axios.get('http://localhost:3000/api/pools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPools(poolsResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Не удалось загрузить данные групп');
      setLoading(false);
    }
  };
  
  // Обработчик для открытия модального окна редактирования
  const handleEditClick = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      coach_id: group.coach_id || '',
      pool_id: group.pool_id || '',
      capacity: group.capacity || 0,
      description: group.description || '',
      category: group.category || ''
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
      console.log('Отправка данных для обновления группы:', formData, 'URL:', `http://localhost:3000/api/admin/groups/${editingGroup.id}`);
      
      const response = await axios.put(
        `http://localhost:3000/api/admin/groups/${editingGroup.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Ответ сервера:', response.data);
      
      // Обновляем список групп
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === editingGroup.id ? { ...group, ...response.data } : group
        )
      );
      
      setSuccessMessage('Группа успешно обновлена');
      setIsEditModalOpen(false);
      
      // Обновляем данные после небольшой задержки
      setTimeout(() => {
        fetchData();
        setSuccessMessage('');
      }, 2000);
      
    } catch (err) {
      console.error('Ошибка при обновлении группы:', err);
      
      // Расширенная информация об ошибке
      if (err.response) {
        // Сервер ответил кодом отличным от 2xx
        console.error('Данные ответа:', err.response.data);
        console.error('Статус ответа:', err.response.status);
        console.error('Заголовки ответа:', err.response.headers);
        
        setError(`Ошибка обновления группы: ${err.response.data.error || 'Неизвестная ошибка'}`);
      } else if (err.request) {
        // Запрос был сделан, но ответ не получен
        console.error('Запрос был отправлен, но ответ не получен:', err.request);
        setError('Сервер не отвечает. Проверьте соединение с интернетом.');
      } else {
        // Что-то случилось при настройке запроса
        console.error('Ошибка настройки запроса:', err.message);
        setError(`Ошибка: ${err.message}`);
      }
    }
  };
  
  // Обработчик для открытия окна подтверждения удаления
  const handleDeleteClick = (group) => {
    setGroupToDelete(group);
    setDeleteConfirmOpen(true);
  };
  
  // Обработчик для удаления группы
  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:3000/api/admin/groups/${groupToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список групп
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupToDelete.id));
      
      setSuccessMessage('Группа успешно удалена');
      setDeleteConfirmOpen(false);
      
      // Скрываем сообщение об успехе через 2 секунды
      setTimeout(() => setSuccessMessage(''), 2000);
      
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      setError('Не удалось удалить группу. Возможно, в ней есть активные участники.');
      setDeleteConfirmOpen(false);
    }
  };

  // Функция для отображения названия категории
  const getCategoryName = (category) => {
    const categories = {
      'beginners': 'Начинающие',
      'teenagers': 'Подростки',
      'adults': 'Взрослые',
      'athletes': 'Спортсмены'
    };
    return categories[category] || category;
  };

  return (
    <div className="admin-groups">
      <h2>Управление группами</h2>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {loading ? (
        <p>Загрузка данных...</p>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="groups-list">
            <h3>Существующие группы</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Тренер</th>
                  <th>Бассейн</th>
                  <th>Вместимость</th>
                  <th>Записано</th>
                  <th>Категория</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <tr key={group.id}>
                    <td>{group.id}</td>
                    <td>{group.name}</td>
                    <td>{group.coach_name}</td>
                    <td>{group.pool_name}</td>
                    <td>{group.capacity}</td>
                    <td>{group.enrolled_count}</td>
                    <td>{getCategoryName(group.category)}</td>
                    <td>
                      <button 
                        className="edit-btn"
                        onClick={() => handleEditClick(group)}
                      >
                        Редактировать
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteClick(group)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="add-group-form">
            <h3>Добавить новую группу</h3>
            {/* Форма добавления группы здесь */}
          </div>
        </>
      )}
      
      {/* Модальное окно редактирования группы */}
      {isEditModalOpen && editingGroup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Редактирование группы</h3>
            <form onSubmit={handleSubmitEdit}>
              <div className="form-group">
                <label>Название:</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Тренер:</label>
                <select 
                  name="coach_id"
                  value={formData.coach_id}
                  onChange={handleInputChange}
                >
                  <option value="">Выберите тренера</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name} - {coach.specialty}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Бассейн:</label>
                <select 
                  name="pool_id"
                  value={formData.pool_id}
                  onChange={handleInputChange}
                >
                  <option value="">Выберите бассейн</option>
                  {pools.map(pool => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Вместимость:</label>
                <input 
                  type="number" 
                  name="capacity"
                  min="1"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Категория:</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите категорию</option>
                  <option value="beginners">Начинающие</option>
                  <option value="teenagers">Подростки</option>
                  <option value="adults">Взрослые</option>
                  <option value="athletes">Спортсмены</option>
                </select>
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
      {deleteConfirmOpen && groupToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm">
            <h3>Подтверждение удаления</h3>
            <p>
              Вы действительно хотите удалить группу "{groupToDelete.name}"?
              {parseInt(groupToDelete.enrolled_count) > 0 && (
                <strong> В этой группе есть {groupToDelete.enrolled_count} участников!</strong>
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

export default AdminGroups;