import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './PoolList.css';

const PoolList = () => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/pools');
        setPools(response.data);
      } catch (err) {
        console.error("Ошибка при загрузке бассейнов:", err);
        setError("Не удалось загрузить список бассейнов");
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const getPoolTypeText = (type) => {
    switch (type) {
      case 'sport': return 'Спортивный';
      case 'health': return 'Оздоровительный';
      case 'combined': return 'Комбинированный';
      default: return type;
    }
  };

  return (
    <div className="pool-list-container">
      <h2>Бассейны</h2>
      
      <div className="pool-grid">
        {pools.map(pool => (
          <div key={pool.id} className="pool-card">
            <h3>{pool.name}</h3>
            <div className="pool-info">
              <p><strong>Адрес:</strong> {pool.address}</p>
              <p><strong>Тип:</strong> {getPoolTypeText(pool.type)}</p>
            </div>
            <div className="pool-actions">
              <Link to={`/pools/${pool.id}`} className="pool-button">
                Подробнее
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PoolList;