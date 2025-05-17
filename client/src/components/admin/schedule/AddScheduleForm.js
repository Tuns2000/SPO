import React, { useState } from 'react';
import './AddScheduleForm.css';

const AddScheduleForm = ({ groups, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    group_id: '',
    date: '',
    time: '',
    status: 'active'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="add-schedule-form-container">
      <h3>Добавить занятие в расписание</h3>
      <form onSubmit={handleSubmit} className="add-schedule-form">
        <div className="form-group">
          <label htmlFor="group_id">Выберите группу:</label>
          <select
            id="group_id"
            name="group_id"
            value={formData.group_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Выберите группу --</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.coach_name} - {group.pool_name})
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="date">Дата занятия:</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="time">Время:</label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="status">Статус:</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="active">Активное</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-button">Добавить</button>
          <button type="button" onClick={onCancel} className="cancel-button">Отмена</button>
        </div>
      </form>
    </div>
  );
};

export default AddScheduleForm;