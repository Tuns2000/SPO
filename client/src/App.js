import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Schedule from './components/Schedule';
import Register from './components/Register';
import Login from './components/Login';
import Subscription from './components/Subscription';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <nav>
        <Link to="/">Расписание</Link> |{' '}
        <Link to="/register">Регистрация</Link> |{' '}
        <Link to="/login">Вход</Link> |{' '}
        <Link to="/subscription">Абонемент</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Schedule />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/subscription" element={<Subscription />} />
      </Routes>
    </div>
  );
}

export default App;
