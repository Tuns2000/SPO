import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="not-found">
      <h2>404 - Страница не найдена</h2>
      <p>Запрошенная страница не существует.</p>
      <Link to="/">Вернуться на главную</Link>
    </div>
  );
}

export default NotFound;