import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './groups.css';

function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    capacity: 10,
    description: '',
    coach_id: '',
    pool_id: '',
    category: 'adults'
  });
  
  const token = localStorage.getItem('token');
  
  // Загрузка списка групп и необходимых данных для форм
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [groupsResponse, coachesResponse, poolsResponse] = await Promise.all([
          axios.get('http://localhost:3000/api/admin/groups', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:3000/api/admin/coaches', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:3000/api/pools', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setGroups(groupsResponse.data);
        setCoaches(coachesResponse.data);
        setPools(poolsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Проверьте соединение с сервером.');
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
      [name]: name === 'capacity' ? parseInt(value, 10) : value
    });
  };
  
  // Открыть модальное окно для добавления группы
  const handleAddGroup = () => {
    setFormData({
      name: '',
      capacity: 10,
      description: '',
      coach_id: coaches.length > 0 ? coaches[0].id : '',
      pool_id: pools.length > 0 ? pools[0].id : '',
      category: 'adults'
    });
    setShowAddModal(true);
  };
  
  // Открыть модальное окно для редактирования группы
  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      capacity: group.capacity || 10,
      description: group.description || '',
      coach_id: group.coach_id || '',
      pool_id: group.pool_id || '',
      category: group.category || 'adults'
    });
    setShowEditModal(true);
  };
  
  // Сохранить новую группу
  const handleSaveNewGroup = async () => {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/admin/groups',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Добавляем новую группу в список
      setGroups([...groups, response.data]);
      
      setSuccessMessage('Группа успешно добавлена');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setShowAddModal(false);
    } catch (err) {
      console.error('Ошибка при создании группы:', err);
      setError(err.response?.data?.error || 'Ошибка при создании группы');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Сохранить изменения в группе
  const handleUpdateGroup = async () => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/admin/groups/${editingGroup.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем группу в списке
      setGroups(groups.map(group => 
        group.id === editingGroup.id ? response.data : group
      ));
      
      setSuccessMessage('Группа успешно обновлена');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setShowEditModal(false);
      setEditingGroup(null);
    } catch (err) {
      console.error('Ошибка при обновлении группы:', err);
      setError(err.response?.data?.error || 'Ошибка при обновлении группы');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Удалить группу
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту группу?')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:3000/api/admin/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Удаляем группу из списка
      setGroups(groups.filter(group => group.id !== groupId));
      
      setSuccessMessage('Группа успешно удалена');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      setError(err.response?.data?.error || 'Ошибка при удалении группы');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Получить имя тренера по ID
  const getCoachName = (coachId) => {
    const coach = coaches.find(c => c.id === coachId);
    return coach ? coach.name : 'Не назначен';
  };
  
  // Получить название бассейна по ID
  const getPoolName = (poolId) => {
    const pool = pools.find(p => p.id === poolId);
    return pool ? pool.name : 'Не назначен';
  };
  
  // Получить текст категории на русском
  const getCategoryText = (category) => {
    switch (category) {
      case 'beginners': return 'Начинающие';
      case 'teenagers': return 'Подростки';
      case 'adults': return 'Взрослые';
      case 'athletes': return 'Спортсмены';
      default: return category;
    }
  };
  
  if (loading) {
    return <div className="loading">Загрузка данных...</div>;
  }
  
  return (
    <div className="admin-groups-container">
      <div className="groups-header">
        <h2>Управление группами</h2>
        <button className="add-button" onClick={handleAddGroup}>
          Добавить группу
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="table-container">
        <table className="groups-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Тренер</th>
              <th>Бассейн</th>
              <th>Вместимость</th>
              <th>Записано</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <tr key={group.id}>
                <td>{group.name}</td>
                <td>{getCoachName(group.coach_id)}</td>
                <td>{getPoolName(group.pool_id)}</td>
                <td>{group.capacity}</td>
                <td>{group.enrolled_count || 0}</td>
                <td className="actions-cell">
                  <button 
                    className="edit-button"
                    onClick={() => handleEditGroup(group)}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Модальное окно добавления группы */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Добавление новой группы</h3>
              <button className="close-button" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название группы:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Вместимость:</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Описание:</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
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
                      {coach.name}
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
                <label>Категория:</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="beginners">Начинающие</option>
                  <option value="teenagers">Подростки</option>
                  <option value="adults">Взрослые</option>
                  <option value="athletes">Спортсмены</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowAddModal(false)}>
                Отмена
              </button>
              <button className="save-button" onClick={handleSaveNewGroup}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно редактирования группы */}
      {showEditModal && editingGroup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Редактирование группы</h3>
              <button className="close-button" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название группы:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Вместимость:</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Описание:</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
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
                      {coach.name}
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
                <label>Категория:</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="beginners">Начинающие</option>
                  <option value="teenagers">Подростки</option>
                  <option value="adults">Взрослые</option>
                  <option value="athletes">Спортсмены</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowEditModal(false)}>
                Отмена
              </button>
              <button className="save-button" onClick={handleUpdateGroup}>
                Обновить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminGroups;