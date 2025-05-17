// Добавьте ссылку в меню для администраторов

{user && user.role === 'admin' && (
  <>
    <li>
      <Link to="/admin/users">Пользователи</Link>
    </li>
    <li>
      <Link to="/admin/subscriptions">Абонементы</Link>
    </li>
    <li>
      <Link to="/admin/analytics">Аналитика</Link>
    </li>
  </>
)}