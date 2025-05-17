import React from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminUsers from '../components/admin/users/users';
// Обратите внимание на регистр букв в пути импорта
//import AdminGroups from '../components/admin/Groups/Groups'; // Изменено с groups/groups на Groups/Groups
import AdminCoaches from '../components/admin/coaches/coaches';
//import AdminSchedule from '../components/admin/Schedule/schedule'; // Правильный путь
import AdminPools from '../components/admin/pools/pools';
import AdminSubscriptions from '../components/admin/subscriptions/subscriptions';
import NotFound from '../components/common/NotFound';

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/users" element={<AdminUsers />} />
      <Route path="/groups" element={<AdminGroups />} />
      <Route path="/coaches" element={<AdminCoaches />} />
      <Route path="/schedule" element={<AdminSchedule />} />
      <Route path="/pools" element={<AdminPools />} />
      <Route path="/subscriptions" element={<AdminSubscriptions />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AdminRoutes;