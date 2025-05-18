import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../styles/CoachDashboard.css';

function CoachDashboard() {
  // Добавляем функцию для преобразования кода категории в читаемое название
  const getCategoryName = (category) => {
    const categories = {
      'beginners': 'Начинающие',
      'teenagers': 'Подростки',
      'adults': 'Взрослые',
      'athletes': 'Спортсмены'
    };
    
    return categories[category] || 'Не указана';
  };

  // Состояния
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  
  // Формы
  const [profileForm, setProfileForm] = useState({
    specialty: '',
    experience: '',
    description: ''
  });
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    capacity: 10,
    description: '',
    category: 'beginners' // Значение по умолчанию - начинающие
  });
  
  // Данные групп
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    loadCoachProfile();
  }, [token, navigate]);

  // Загрузка профиля тренера
  const loadCoachProfile = async () => {
    try {
      setLoading(true);
      console.log('Загрузка профиля тренера...');
      
      const response = await axios.get('http://localhost:3000/api/coach/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Получен ответ:', response.data);
      setProfileData(response.data);
      
      if (response.data.groups) {
        setGroups(response.data.groups);
      }
      
      // Заполняем форму данными тренера
      if (response.data.coach_info) {
        setProfileForm({
          specialty: response.data.coach_info?.specialty || '',
          experience: response.data.coach_info?.experience || '',
          description: response.data.coach_info?.description || ''
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке профиля тренера:', err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Не удалось загрузить данные тренера');
      }
      
      setLoading(false);
    }
  };

  // Загрузка групп
  const loadGroups = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get('http://localhost:3000/api/coach/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Добавляем категорию по умолчанию, если она отсутствует
      const groupsWithCategory = response.data.map(group => ({
        ...group,
        category: group.category || 'beginners'
      }));
      
      setGroups(groupsWithCategory);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке групп:', err);
      setError('Не удалось загрузить группы');
      setLoading(false);
    }
  };

  // Загрузка участников группы
  const loadGroupMembers = async (groupId) => {
    try {
      setLoading(true);
      
      const response = await axios.get(`http://localhost:3000/api/coach/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGroupMembers(response.data);
      setSelectedGroupId(groupId);
      setShowMembers(true);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке участников группы:', err);
      alert('Не удалось загрузить список участников');
      setLoading(false);
    }
  };

  // Удаление участника из группы
  const handleRemoveMember = async (groupId, memberId, memberName) => {
    if (!window.confirm(`Вы действительно хотите удалить ${memberName} из группы?`)) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/coach/groups/${groupId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Участник успешно удален из группы');
      // Обновляем список участников
      loadGroupMembers(groupId);
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
      alert('Не удалось удалить участника из группы');
    }
  };

  // Возврат к списку групп
  const handleBackToGroups = () => {
    setShowMembers(false);
    setSelectedGroupId(null);
  };

  // Обработчики изменения форм
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGroupInputChange = (e) => {
    const { name, value } = e.target;
    setGroupForm(prev => ({ ...prev, [name]: value }));
  };

  // Обновление профиля
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put('http://localhost:3000/api/coach/profile', profileForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Профиль тренера успешно обновлен');
      loadCoachProfile();
    } catch (err) {
      console.error('Ошибка при обновлении профиля:', err);
      alert('Не удалось обновить профиль');
    }
  };

  // Создание новой группы
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post('http://localhost:3000/api/coach/groups', groupForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Группа успешно создана');
      loadGroups();
      setGroupForm({ name: '', capacity: 10, description: '', category: 'beginners' });
    } catch (err) {
      console.error('Ошибка при создании группы:', err);
      alert('Не удалось создать группу');
    }
  };

  // Выбор группы для редактирования
  const selectGroup = (group) => {
    setSelectedGroup(group);
    setGroupForm({
      name: group.name,
      capacity: group.capacity,
      description: group.description || '',
      category: group.category || 'beginners' // Если нет категории, ставим значение по умолчанию
    });
  };

  // Убедитесь, что ID группы передается корректно
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !selectedGroup.id) {
      console.error('ID группы отсутствует');
      return;
    }
    
    console.log('Обновление группы с ID:', selectedGroup.id);
    
    try {
      await axios.put(`http://localhost:3000/api/coach/groups/${selectedGroup.id}`, groupForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Информация о группе обновлена');
      loadGroups();
      setSelectedGroup(null);
    } catch (err) {
      console.error('Ошибка при обновлении группы:', err);
      alert('Не удалось обновить группу');
    }
  };

  // Удаление группы
  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту группу?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/coach/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Группа успешно удалена');
      loadGroups();
      if (selectedGroup && selectedGroup.id === id) {
        setSelectedGroup(null);
        // Обновляем, чтобы включить поле category
        setGroupForm({ name: '', capacity: 10, description: '', category: 'beginners' });
      }
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      alert('Не удалось удалить группу');
    }
  };

  if (loading && !profileData) {
    return <div className="loading">Загрузка данных тренера...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="coach-dashboard">
      <h1>Панель управления тренера</h1>
      
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'profile' ? 'tab-button active' : 'tab-button'} 
          onClick={() => setActiveTab('profile')}
        >
          Профиль
        </button>
        <button 
          className={activeTab === 'groups' ? 'tab-button active' : 'tab-button'} 
          onClick={() => { 
            setActiveTab('groups'); 
            loadGroups(); 
          }}
        >
          Мои группы
        </button>
        <button 
          className={activeTab === 'create-group' ? 'tab-button active' : 'tab-button'} 
          onClick={() => setActiveTab('create-group')}
        >
          Создать группу
        </button>
      </div>
      
      {/* Вкладка профиля */}
      {activeTab === 'profile' && profileData && (
        <div className="profile-section">
          <div className="coach-profile">
            <h2>Информация о тренере</h2>
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
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label>Специализация</label>
                <input
                  type="text"
                  name="specialty"
                  value={profileForm.specialty}
                  onChange={handleProfileInputChange}
                  placeholder="Укажите специализацию"
                />
              </div>
              
              <div className="form-group">
                <label>Опыт работы (лет)</label>
                <input
                  type="number"
                  name="experience"
                  value={profileForm.experience}
                  onChange={handleProfileInputChange}
                  min="0"
                  placeholder="Укажите опыт работы"
                />
              </div>
              
              <div className="form-group">
                <label>О себе</label>
                <textarea
                  name="description"
                  value={profileForm.description}
                  onChange={handleProfileInputChange}
                  placeholder="Расскажите о своем опыте и подходе к тренировкам"
                  rows="5"
                ></textarea>
              </div>
              
              <button type="submit" className="submit-btn">Сохранить изменения</button>
            </form>
          </div>
        </div>
      )}
      
      {/* Вкладка с группами */}
      {activeTab === 'groups' && (
        <div className="groups-section">
          <h2>Мои группы</h2>
          
          {showMembers ? (
            <div className="group-members-section">
              <h3>Участники группы</h3>
              <button onClick={handleBackToGroups} className="back-btn">Назад к группам</button>
              {groupMembers.length === 0 ? (
                <p>В этой группе пока нет участников.</p>
              ) : (
                <ul className="members-list">
                  {groupMembers.map(member => (
                    <li key={member.id} className="member-item">
                      <span>{member.name}</span>
                      <button 
                        className="remove-btn" 
                        onClick={() => handleRemoveMember(selectedGroupId, member.id, member.name)}
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : groups.length === 0 ? (
            <div className="no-groups">
              <p>У вас пока нет созданных групп.</p>
              <button onClick={() => setActiveTab('create-group')} className="submit-btn">
                Создать новую группу
              </button>
            </div>
          ) : (
            <div className="groups-wrapper">
              {selectedGroup ? (
                <div className="group-details">
                  <h3>Редактирование группы</h3>
                  <form onSubmit={handleUpdateGroup}>
                    <div className="form-group">
                      <label>Название группы</label>
                      <input
                        type="text"
                        name="name"
                        value={groupForm.name}
                        onChange={handleGroupInputChange}
                        placeholder="Название группы"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Вместимость</label>
                      <input
                        type="number"
                        name="capacity"
                        value={groupForm.capacity}
                        onChange={handleGroupInputChange}
                        min="1"
                        required
                      />
                    </div>
                    
                    {/* Добавляем выбор категории */}
                    <div className="form-group">
                      <label>Категория группы</label>
                      <select
                        name="category"
                        value={groupForm.category}
                        onChange={handleGroupInputChange}
                        required
                      >
                        <option value="beginners">Начинающие</option>
                        <option value="teenagers">Подростки</option>
                        <option value="adults">Взрослые</option>
                        <option value="athletes">Спортсмены</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Описание</label>
                      <textarea
                        name="description"
                        value={groupForm.description}
                        onChange={handleGroupInputChange}
                        placeholder="Описание группы"
                        rows="3"
                      ></textarea>
                    </div>
                    
                    <div className="form-buttons">
                      <button type="submit" className="submit-btn">Сохранить</button>
                      <button 
                        type="button" 
                        onClick={() => setSelectedGroup(null)}
                        className="cancel-btn"
                      >
                        Отмена
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteGroup(selectedGroup.id)}
                        className="delete-btn"
                      >
                        Удалить группу
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="groups-list">
                  {groups.map(group => (
                    <div key={group.id} className="group-item">
                      <h3>{group.name}</h3>
                      <p>{group.description || 'Нет описания'}</p>
                      <div className="group-meta">
                        <span>Вместимость: {group.capacity}</span>
                        {group.enrolled_count !== undefined && (
                          <span>Участники: {group.enrolled_count}/{group.capacity}</span>
                        )}
                        {/* Добавляем отображение категории */}
                        <span>Категория: {getCategoryName(group.category)}</span>
                      </div>
                      <button 
                        className="edit-btn" 
                        onClick={() => selectGroup(group)}
                      >
                        Редактировать
                      </button>
                      <button 
                        className="view-members-btn" 
                        onClick={() => loadGroupMembers(group.id)}
                      >
                        Просмотреть участников
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Вкладка создания группы */}
      {activeTab === 'create-group' && (
        <div className="create-group-section">
          <h2>Создать новую группу</h2>
          <form onSubmit={handleCreateGroup}>
            <div className="form-group">
              <label>Название группы</label>
              <input
                type="text"
                name="name"
                value={groupForm.name}
                onChange={handleGroupInputChange}
                placeholder="Введите название группы"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Вместимость</label>
              <input
                type="number"
                name="capacity"
                value={groupForm.capacity}
                onChange={handleGroupInputChange}
                min="1"
                required
              />
            </div>
            
            {/* Добавляем выбор категории */}
            <div className="form-group">
              <label>Категория группы</label>
              <select
                name="category"
                value={groupForm.category}
                onChange={handleGroupInputChange}
                required
              >
                <option value="beginners">Начинающие</option>
                <option value="teenagers">Подростки</option>
                <option value="adults">Взрослые</option>
                <option value="athletes">Спортсмены</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                value={groupForm.description}
                onChange={handleGroupInputChange}
                placeholder="Расскажите о группе"
                rows="5"
              ></textarea>
            </div>
            
            <button type="submit" className="submit-btn">Создать группу</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default CoachDashboard;