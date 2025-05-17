import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './AddEditGroup.css';

const AddEditGroup = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    capacity: 10,
    coach_id: '',
    pool_id: '',
    category: 'adults',
    description: ''
  });
  
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [pools, setPools] = useState([]);
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    // Загружаем данные группы при редактировании
    if (isEditing) {
      loadGroupData();
    }
    
    // Загружаем списки тренеров и бассейнов
    loadCoaches();
    loadPools();
  }, [id]);
  
  const loadGroupData = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/admin/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFormData({
        name: response.data.name,
        capacity: response.data.capacity,
        coach_id: response.data.coach_id,
        pool_id: response.data.pool_id,
        category: response.data.category,
        description: response.data.description || ''
      });
      
      setError(null);
    } catch (err) {
      console.error('Ошибка при загрузке данных группы:', err);
      setError('Не удалось загрузить данные группы');
    } finally {
      setLoading(false);
    }
  };
  
  const loadCoaches = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/admin/coaches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCoaches(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке списка тренеров:', err);
    }
  };
  
  const loadPools = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/pools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPools(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке списка бассейнов:', err);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await axios.put(
          `http://localhost:3000/api/admin/groups/${id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:3000/api/admin/groups',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      navigate('/admin/groups');
    } catch (err) {
      console.error('Ошибка при сохранении группы:', err);
      setError(err.response?.data?.error || 'Ошибка при сохранении группы');
    }
  };

  if (loading) {
    return <div className="loading-message">Загрузка данных...</div>;
  }

  return (
    <div className="add-edit-group">
      <h2>{isEditing ? 'Редактирование группы' : 'Создание новой группы'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="group-form">
        <div className="form-group">
          <label htmlFor="name">Название группы:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="capacity">Вместимость:</label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            min="1"
            max="50"
            value={formData.capacity}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="coach_id">Тренер:</label>
          <select
            id="coach_id"
            name="coach_id"
            value={formData.coach_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Выберите тренера --</option>
            {coaches.map(coach => (
              <option key={coach.id} value={coach.id}>
                {coach.coach_name} ({coach.specialty})
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="pool_id">Бассейн:</label>
          <select
            id="pool_id"
            name="pool_id"
            value={formData.pool_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Выберите бассейн --</option>
            {pools.map(pool => (
              <option key={pool.id} value={pool.id}>
                {pool.name} ({pool.address})
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Категория:</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="beginners">Начинающие</option>
            <option value="teenagers">Подростки</option>
            <option value="adults">Взрослые</option>
            <option value="athletes">Спортсмены</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Описание:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-button">
            {isEditing ? 'Сохранить изменения' : 'Создать группу'}
          </button>
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate('/admin/groups')}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditGroup;