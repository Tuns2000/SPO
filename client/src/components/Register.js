import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    
    // Валидация
    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const registerData = {
      name: form.name,
      email: form.email,
      password: form.password
    };
    
    axios.post('http://localhost:3000/api/auth/register', registerData)
      .then(() => {
        return axios.post('http://localhost:3000/api/auth/login', {
          email: form.email,
          password: form.password
        });
      })
      .then(res => {
        localStorage.setItem('user', res.data.name);
        localStorage.setItem('token', res.data.token);
        navigate('/profile');
        window.location.reload();
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Ошибка при регистрации');
        setLoading(false);
      });
  };

  return (
    <div className="card">
      <h2>Регистрация нового пользователя</h2>
      {error && <div className="error-message" style={{color: 'red', marginBottom: '15px'}}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Имя:</label>
          <input 
            id="name"
            name="name" 
            placeholder="Введите ваше имя" 
            onChange={handleChange}
            value={form.name}
            className="form-input" 
            required 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="reg-email">Email:</label>
          <input 
            id="reg-email"
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
          <label htmlFor="reg-password">Пароль:</label>
          <input 
            id="reg-password"
            name="password" 
            type="password" 
            placeholder="Создайте пароль" 
            onChange={handleChange}
            value={form.password}
            className="form-input" 
            required 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Подтверждение пароля:</label>
          <input 
            id="confirmPassword"
            name="confirmPassword" 
            type="password" 
            placeholder="Подтвердите пароль" 
            onChange={handleChange}
            value={form.confirmPassword}
            className="form-input" 
            required 
          />
        </div>
        
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}

export default Register;
