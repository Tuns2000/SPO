import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './pools.css';

function AdminPools() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPool, setEditingPool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'sport'
  });
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');

  // Загрузка списка бассейнов
  useEffect(() => {
    const fetchPools = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3000/api/pools', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPools(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке бассейнов:', err);
        setError('Не удалось загрузить список бассейнов');
        setLoading(false);
      }
    };

    fetchPools();
  }, [token]);

  // Обработка изменений в форме
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Начало редактирования бассейна
  const handleEditClick = (pool) => {
    setEditingPool(pool);
    setFormData({
      name: pool.name,
      address: pool.address,
      type: pool.type
    });
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingPool(null);
    setFormData({
      name: '',
      address: '',
      type: 'sport'
    });
  };

  // Сохранение изменений
  const handleSaveChanges = async () => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/pools/${editingPool.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список бассейнов
      setPools(pools.map(pool => 
        pool.id === editingPool.id ? response.data : pool
      ));
      
      setSuccessMessage('Бассейн успешно обновлен');
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingPool(null);
      
    } catch (err) {
      console.error('Ошибка при обновлении бассейна:', err);
      setError(err.response?.data?.error || 'Ошибка при обновлении бассейна');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Получение названия типа бассейна на русском
  const getPoolTypeText = (type) => {
    switch(type) {
      case 'sport': return 'Спортивный';
      case 'health': return 'Оздоровительный';
      case 'combined': return 'Комбинированный';
      default: return type;
    }
  };

  return (
    <div className="admin-pools-container">
      <h2>Управление бассейнами</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {loading ? (
        <div className="loading">Загрузка бассейнов...</div>
      ) : (
        <div className="pools-list">
          {pools.map(pool => (
            <div key={pool.id} className="pool-item">
              <div className="pool-details">
                <h3>{pool.name}</h3>
                <p><strong>Адрес:</strong> {pool.address}</p>
                <p><strong>Тип:</strong> {getPoolTypeText(pool.type)}</p>
              </div>
              <div className="pool-actions">
                <button 
                  className="edit-button"
                  onClick={() => handleEditClick(pool)}
                >
                  Редактировать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Модальное окно редактирования */}
      {editingPool && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3>Редактирование бассейна</h3>
            
            <div className="form-group">
              <label>Название:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Адрес:</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Тип:</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="sport">Спортивный</option>
                <option value="health">Оздоровительный</option>
                <option value="combined">Комбинированный</option>
              </select>
            </div>
            
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancelEdit}>
                Отмена
              </button>
              <button className="save-button" onClick={handleSaveChanges}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPools;