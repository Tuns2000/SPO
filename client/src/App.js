import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Schedule from './components/Schedule';
import Register from './components/Register';
import Login from './components/Login';
import Subscription from './components/Subscription';
import Profile from './components/Profile';
import GroupList from './components/groups/GroupList';
import GroupDetail from './components/groups/GroupDetail';
import CoachDashboard from './components/coach/CoachDashboard';
import AdminDashboard from './components/admin/Dashboard';
import MyEnrollments from './components/user/MyEnrollments';
import PoolList from './components/pools/PoolList';
import PoolDetail from './components/pools/PoolDetail';
import EditPool from './components/pools/EditPool';
import AddGroupToPool from './components/pools/AddGroupToPool';
import './components/groups/Group.css';

import './styles/App.css';




// import AdminSchedule from './components/admin/Schedule/AdminSchedule';
// import AdminGroups from './components/admin/Groups/AdminGroups';
// import AdminCoaches from './components/admin/Coaches/AdminCoaches';


import AdminSchedule from './components/admin/schedule/schedule';
import AdminGroups from './components/admin/groups/groups';
import AdminCoaches from './components/admin/coaches/coaches';

function App() {
  const username = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  return (
    <UserProvider>
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
            <Link to="/groups" className="nav-link">Группы</Link>
            <Link to="/pools" className="nav-link">Бассейны</Link>
            
            {/* Ссылки для неавторизованных пользователей */}
            {!username && (
              <>
                <Link to="/register" className="nav-link">Регистрация</Link>
                <Link to="/login" className="nav-link">Вход</Link>
              </>
            )}
            
            {/* Ссылки для авторизованных пользователей (любая роль) */}
            {username && (
              <>
                <Link to="/subscription" className="nav-link">Абонементы</Link>
                <Link to="/profile" className="nav-link">Профиль</Link>
                <Link to="/my-enrollments" className="nav-link">Мои группы</Link>
              </>
            )}
            
            {/* Ссылки для тренеров */}
            {role === 'coach' && (
              <Link to="/coach-dashboard" className="nav-link special-link coach-link">Панель тренера</Link>
            )}
            
            {/* Ссылки для администраторов */}
            {role === 'admin' && (
              <>
                <Link to="/admin-dashboard" className="nav-link special-link admin-link">Панель администратора</Link>
                </>
            )}
          </div>
          
          <div>
            {username ? (
              <div className="user-info">
                <span className="user-greeting">
                  Здравствуйте, {username}!
                  {role && <span className="user-role">{roleToText(role)}</span>}
                </span>
                <button 
                  onClick={() => {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
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
          <Route path="/groups" element={<GroupList />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/pools" element={<PoolList />} />
          <Route path="/pools/:id" element={<PoolDetail />} />
          
          {/* Защищенные маршруты - только для авторизованных пользователей */}
          <Route
            path="/subscription"
            element={
              username ? <Subscription /> : <AccessDenied />
            }
          />
          
          {/* Маршруты для тренеров */}
          <Route
            path="/coach-dashboard/*"
            element={
              role === 'coach' ? <CoachDashboard /> : <AccessDenied />
            }
          />
          
          {/* Маршруты для администраторов */}
          <Route
            path="/admin-dashboard/*"
            element={
              role === 'admin' ? <AdminDashboard /> : <AccessDenied />
            }
          />
          
          {/* Маршрут для страницы "Мои группы" */}
          <Route
            path="/my-enrollments"
            element={
              username ? <MyEnrollments /> : <AccessDenied />
            }
          />
          
          {/* Если нужно, добавьте маршруты для админа */}
          {role === 'admin' && (
            <>
              <Route path="/pools/:id/edit" element={<EditPool />} />
              <Route path="/pools/:id/add-group" element={<AddGroupToPool />} />
              <Route path="/admin/schedule" element={<AdminSchedule />} />
              <Route path="/admin/groups" element={<AdminGroups />} />
              <Route path="/admin/coaches" element={<AdminCoaches />} />
            </>
          )}
        </Routes>
        
        <div className="wave-footer"></div>
        <footer className="footer">
          <p>&copy; 2025 Аквамир. Все права защищены.</p>
        </footer>
      </div>
    </UserProvider>
  );
}

// Преобразование роли в читаемый текст
function roleToText(role) {
  switch(role) {
    case 'admin':
      return 'Администратор';
    case 'coach':
      return 'Тренер';
    case 'client':
      return 'Клиент';
    default:
      return role;
  }
}

// Компонент для отображения ошибки доступа
function AccessDenied() {
  return (
    <div className="access-denied">
      <h2>Доступ запрещен</h2>
      <p>У вас нет прав для просмотра этой страницы. Пожалуйста, войдите в систему с соответствующими правами.</p>
      <Link to="/login" className="btn">Войти</Link>
    </div>
  );
}

export default App;