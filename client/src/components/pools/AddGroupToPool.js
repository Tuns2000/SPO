import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './PoolForm.css';

const AddGroupToPool = () => {
  const { id: poolId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    coachId: '',
    capacity: 10,
    category: 'beginners',
    description: ''
  });
  
  const [coaches, setCoaches] = useState([]);
  const [poolName, setPoolName] = useState('');
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPoolAndCoaches = async () => {
      try {
        // Загружаем информацию о бассейне
        const poolResponse = await axios.get(`http://localhost:3000/api/pools/${poolId}`);
        setPoolName(poolResponse.data.name);
        
        // Загружаем тренеров этого бассейна
        if (poolResponse.data.coaches && poolResponse.data.coaches.length > 0) {
          setCoaches(poolResponse.data.coaches);
          // Устанавливаем первого тренера как выбранного по умолчанию
          setFormData(prev => ({
            ...prev,
            coachId: poolResponse.data.coaches[0].id
          }));
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Ошибка при загрузке данных:", err);
        setError("Не удалось загрузить необходимые данные");
        setLoading(false);
      }
    };

    fetchPoolAndCoaches();
  }, [poolId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'capacity' ? parseInt(value, 10) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(
        `http://localhost:3000/api/group/pool/${poolId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert("Группа успешно добавлена в бассейн");
      navigate(`/pools/${poolId}`);
    } catch (err) {
      console.error("Ошибка при добавлении группы:", err);
      setError(err.response?.data?.error || "Не удалось добавить группу");
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (coaches.length === 0) {
    return (
      <div className="pool-form-container">
        <h2>Добавление группы в бассейн "{poolName}"</h2>
        <div className="error">
          <p>В этом бассейне нет доступных тренеров.</p>
          <p>Добавьте тренеров в бассейн, прежде чем создавать группы.</p>
        </div>
        <button 
          className="cancel-button" 
          onClick={() => navigate(`/pools/${poolId}`)}
        >
          Вернуться к бассейну
        </button>
      </div>
    );
  }

  return (
    <div className="pool-form-container">
      <h2>Добавление группы в бассейн "{poolName}"</h2>
      
      <form className="pool-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Название группы</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="coachId">Тренер</label>
          <select
            id="coachId"
            name="coachId"
            value={formData.coachId}
            onChange={handleChange}
            required
          >
            {coaches.map(coach => (
              <option key={coach.id} value={coach.id}>
                {coach.name} - {coach.specialty}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="capacity">Вместимость группы</label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            max="50"
            value={formData.capacity}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Категория</label>
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
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-button">Добавить группу</button>
          <button 
            type="button" 
            className="cancel-button" 
            onClick={() => navigate(`/pools/${poolId}`)}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddGroupToPool;