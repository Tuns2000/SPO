const pool = require('../db');  // Правильный импорт pool

function roleMiddleware(roles) {
  return async function(req, res, next) {
    // Проверяем, прошел ли пользователь аутентификацию
    if (!req.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    
    // Проверяем, имеет ли пользователь необходимую роль
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Доступ запрещен. У вас нет необходимых прав.'
      });
    }
    
    // Если проверки пройдены, переходим к следующему middleware
    next();
  };
}

const authorizeAdmin = async (req, res, next) => {
  // Проверяем, есть ли у нас информация о пользователе из verifyToken
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }
  
  try {
    // Проверяем роль пользователя в базе данных
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const userRole = result.rows[0].role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
    }
    
    // Если пользователь админ, разрешаем доступ
    next();
  } catch (err) {
    console.error('Ошибка при проверке роли:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = { 
  roleMiddleware,
  authorizeAdmin 
};