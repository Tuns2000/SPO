import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password
      });
      
      console.log('Ответ от сервера:', response.data); // отладочный лог
      
      // Проверка структуры ответа перед сохранением
      if (response.data && response.data.token) {
        // Сохраняем токен
        localStorage.setItem('token', response.data.token);
        
        // Сохраняем информацию о пользователе
        localStorage.setItem('user', response.data.user.name);
        localStorage.setItem('role', response.data.user.role);
        
        // Перенаправляем пользователя с обновлением страницы
        window.location.href = redirectTo;
      } else {
        throw new Error('Некорректный формат ответа от сервера');
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Произошла ошибка при входе. Пожалуйста, попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Вход в систему</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        <div className="auth-links">
          Нет аккаунта? <a href="/register">Зарегистрироваться</a>
        </div>
      </div>
    </div>
  );
}

export default Login;
