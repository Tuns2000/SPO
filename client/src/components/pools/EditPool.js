import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './PoolForm.css';

const EditPool = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'sport'
  });
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/pools/${id}`);
        const { name, address, type } = response.data;
        
        setFormData({ name, address, type });
        setLoading(false);
      } catch (err) {
        console.error("Ошибка при загрузке данных бассейна:", err);
        setError("Не удалось загрузить данные бассейна");
        setLoading(false);
      }
    };

    fetchPoolData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(
        `http://localhost:3000/api/pools/${id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert("Данные бассейна успешно обновлены");
      navigate(`/pools/${id}`);
    } catch (err) {
      console.error("Ошибка при обновлении бассейна:", err);
      setError(err.response?.data?.error || "Не удалось обновить данные бассейна");
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="pool-form-container">
      <h2>Редактирование бассейна</h2>
      
      <form className="pool-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Название</label>
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
          <label htmlFor="address">Адрес</label>
          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="type">Тип бассейна</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="sport">Спортивный</option>
            <option value="health">Оздоровительный</option>
            <option value="combined">Комбинированный</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-button">Сохранить</button>
          <button 
            type="button" 
            className="cancel-button" 
            onClick={() => navigate(`/pools/${id}`)}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPool;