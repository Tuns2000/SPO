import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Schedule from './components/Schedule';
import Register from './components/Register';
import Login from './components/Login';
import Subscription from './components/Subscription';
import Profile from './components/Profile';
import './styles/App.css';

function App() {
  const username = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <h1>Аквамир</h1>
          <p>Лучший бассейн для всей семьи</p>
        </div>
      </header>
      
      <nav className="navbar">
        <div className="nav-links">
          <Link to="/" className="nav-link">Расписание</Link>
          {!username && <Link to="/register" className="nav-link">Регистрация</Link>}
          {!username && <Link to="/login" className="nav-link">Вход</Link>}
          {username && <Link to="/subscription" className="nav-link">Абонементы</Link>}
          {username && <Link to="/profile" className="nav-link">Профиль</Link>}
        </div>
        <div>
          {username ? (
            <div className="user-info">
              Здравствуйте, {username}!
              <button 
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  window.location.reload();
                }} 
                className="logout-btn"
              >
                Выйти
              </button>
            </div>
          ) : (
            <span className="user-info">Вы не вошли в систему</span>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Schedule />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/subscription"
          element={
            username ? <Subscription /> : <div className="card"><p>Доступ запрещён. Войдите в систему.</p></div>
          }
        />
      </Routes>
      
      <div className="wave-footer"></div>
      <footer className="footer">
        <p>&copy; 2025 Аквамир. Все права защищены.</p>
      </footer>
    </div>
  );
}

export default App;