import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/CoachDashboard.css';

function CoachDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    specialty: '',
    experience: '',
    description: ''
  });
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // При загрузке компонента загружаем данные профиля
  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { redirectTo: '/coach-dashboard' } });
      return;
    }
    
    fetchData();
  }, [token, navigate]);

  // Функция для загрузки данных профиля тренера
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Запрашиваем данные профиля тренера...');
      
      const response = await axios.get('http://localhost:3000/api/coach/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Получены данные профиля:', response.data);
      setProfileData(response.data);
      
      // Заполняем форму данными тренера
      if (response.data.coach_info) {
        setFormData({
          specialty: response.data.coach_info.specialty || '',
          experience: response.data.coach_info.experience || '',
          description: response.data.coach_info.description || ''
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке данных тренера:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { 
          state: { redirectTo: '/coach-dashboard', message: 'Сессия истекла, пожалуйста, войдите снова' } 
        });
        return;
      }
      
      setError('Не удалось загрузить данные тренера');
      setLoading(false);
    }
  };
  
  // Обработка изменения в полях формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Сохранение профиля тренера
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put('http://localhost:3000/api/coach/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Профиль успешно обновлен');
      fetchData(); // Перезагружаем данные
    } catch (err) {
      console.error('Ошибка при обновлении профиля:', err);
      alert('Не удалось обновить профиль');
    }
  };
  
  // Отображение загрузки
  if (loading) {
    return <div className="loading">Загрузка данных тренера...</div>;
  }
  
  // Отображение ошибки
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  // Если данные не получены
  if (!profileData) {
    return <div className="error-message">Данные профиля не загружены</div>;
  }
  
  return (
    <div className="coach-dashboard">
      <h1>Панель тренера</h1>
      
      <div className="coach-profile">
        <h2>Профиль тренера</h2>
        <div className="profile-info">
          <p><strong>Имя:</strong> {profileData.user?.name}</p>
          <p><strong>Email:</strong> {profileData.user?.email}</p>
          <p><strong>Специализация:</strong> {profileData.coach_info?.specialty || 'Не указана'}</p>
          <p><strong>Опыт работы:</strong> {profileData.coach_info?.experience || 0} лет</p>
          <p><strong>Рейтинг:</strong> {profileData.coach_info?.rating || 0}/5</p>
          <p><strong>Описание:</strong> {profileData.coach_info?.description || 'Информация отсутствует'}</p>
        </div>
      </div>
      
      <div className="coach-form">
        <h2>Редактировать профиль</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Специализация</label>
            <input 
              type="text"
              name="specialty"
              value={formData.specialty}
              onChange={handleInputChange}
              placeholder="Укажите специализацию"
            />
          </div>
          
          <div className="form-group">
            <label>Опыт работы (лет)</label>
            <input 
              type="number"
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              min="0"
              placeholder="Укажите опыт работы"
            />
          </div>
          
          <div className="form-group">
            <label>О себе</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Расскажите о своем опыте и подходе к тренировкам"
              rows="5"
            ></textarea>
          </div>
          
          <button type="submit" className="submit-btn">Сохранить изменения</button>
        </form>
      </div>
      
      {profileData.groups && profileData.groups.length > 0 ? (
        <div className="coach-groups">
          <h2>Мои группы</h2>
          <div className="groups-list">
            {profileData.groups.map(group => (
              <div key={group.id} className="group-item">
                <h3>{group.name}</h3>
                <p>{group.description || 'Описание отсутствует'}</p>
                <div className="group-meta">
                  <span>Участники: {group.enrolled_count || 0}/{group.capacity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-groups">
          <h2>Мои группы</h2>
          <p>У вас пока нет назначенных групп</p>
        </div>
      )}
    </div>
  );
}

export default CoachDashboard;