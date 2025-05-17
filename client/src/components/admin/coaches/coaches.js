import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './coaches.css';

function AdminCoaches() {
  const [coaches, setCoaches] = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentCoach, setCurrentCoach] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    specialty: '',
    experience: '',
    description: '',
    pool_id: ''
  });
  
  const token = localStorage.getItem('token');
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Запрашиваем данные о тренерах и бассейнах параллельно
        const [coachesResponse, poolsResponse] = await Promise.all([
          axios.get('http://localhost:3000/api/admin/coaches', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:3000/api/pools', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setCoaches(coachesResponse.data);
        setPools(poolsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);
  
  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'experience' ? Number(value) : value
    });
  };
  
  // Открытие модального окна для редактирования
  const handleEditCoach = (coach) => {
    setCurrentCoach(coach);
    setFormData({
      specialty: coach.specialty || '',
      experience: coach.experience || '',
      description: coach.description || '',
      pool_id: coach.pool_id || ''
    });
    setShowEditModal(true);
  };
  
  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowEditModal(false);
    setCurrentCoach(null);
  };
  
  // Обработчик обновления тренера
  const handleUpdateCoach = async () => {
    try {
      // Проверяем, что бассейн выбран
      if (!formData.pool_id) {
        setError('Необходимо выбрать бассейн для тренера');
        return;
      }
      
      setError(null);
      
      const response = await axios.put(
        `http://localhost:3000/api/admin/coaches/${currentCoach.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список тренеров
      setCoaches(coaches.map(coach => 
        coach.id === currentCoach.id ? response.data.coach : coach
      ));
      
      setSuccessMessage(`Тренер ${currentCoach.name} успешно обновлен`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      handleCloseModal();
    } catch (err) {
      console.error('Ошибка при обновлении тренера:', err);
      setError(err.response?.data?.error || 'Произошла ошибка при обновлении тренера');
    }
  };
  
  // Отображение названия бассейна
  const getPoolName = (poolId) => {
    if (!poolId) return 'Не назначен';
    const pool = pools.find(p => p.id === poolId);
    return pool ? pool.name : 'Не найден';
  };
  
  if (loading) {
    return <div className="loading">Загрузка данных о тренерах...</div>;
  }
  
  return (
    <div className="admin-coaches-container">
      <h2>Управление тренерами</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="coaches-table-container">
        <table className="coaches-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Специализация</th>
              <th>Опыт (лет)</th>
              <th>Бассейн</th>
              <th>Количество групп</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {coaches.length > 0 ? (
              coaches.map(coach => (
                <tr key={coach.id}>
                  <td>{coach.id}</td>
                  <td>{coach.name}</td>
                  <td>{coach.specialty || '—'}</td>
                  <td>{coach.experience || '0'}</td>
                  <td className={coach.pool_id ? "" : "not-assigned"}>
                    {getPoolName(coach.pool_id)}
                  </td>
                  <td>{coach.groups_count || '0'}</td>
                  <td>
                    <button 
                      className="edit-button"
                      onClick={() => handleEditCoach(coach)}
                    >
                      Редактировать
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">Тренеры не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Модальное окно редактирования тренера */}
      {showEditModal && currentCoach && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Редактирование тренера - {currentCoach.name}</h3>
              <button className="close-button" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Специализация:</label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  placeholder="Например: Плавание, Фристайл"
                />
              </div>
              
              <div className="form-group">
                <label>Опыт (лет):</label>
                <input
                  type="number"
                  name="experience"
                  min="0"
                  max="50"
                  value={formData.experience}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>Описание:</label>
                <textarea
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Опыт работы, достижения, образование..."
                ></textarea>
              </div>
              
              <div className="form-group required">
                <label>Бассейн: <span className="required-mark">*</span></label>
                <select
                  name="pool_id"
                  value={formData.pool_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите бассейн</option>
                  {pools.map(pool => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name} ({pool.address})
                    </option>
                  ))}
                </select>
                {!formData.pool_id && <div className="field-error">Необходимо выбрать бассейн</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={handleCloseModal}>
                Отмена
              </button>
              <button
                className="save-button"
                onClick={handleUpdateCoach}
                disabled={!formData.pool_id}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCoaches;