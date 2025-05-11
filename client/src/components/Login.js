import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    axios.post('http://localhost:3000/api/auth/login', form)
      .then(res => {
        localStorage.setItem('user', res.data.name);
        localStorage.setItem('token', res.data.token);
        navigate('/profile');
        window.location.reload(); // Обновляем страницу для отображения новой навигации
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Ошибка при входе');
        setLoading(false);
      });
  };

  return (
    <div className="card">
      <h2>Вход в личный кабинет</h2>
      {error && <div className="error-message" style={{color: 'red', marginBottom: '15px'}}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input 
            id="email"
            name="email" 
            type="email" 
            placeholder="Введите ваш email" 
            onChange={handleChange}
            value={form.email}
            className="form-input" 
            required 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input 
            id="password"
            name="password" 
            type="password" 
            placeholder="Введите ваш пароль" 
            onChange={handleChange}
            value={form.password}
            className="form-input" 
            required 
          />
        </div>
        
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

export default Login;
