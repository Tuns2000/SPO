function roleMiddleware(roles) {
  return function(req, res, next) {
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

module.exports = roleMiddleware;