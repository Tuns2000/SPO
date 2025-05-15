const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не предоставлен токен авторизации' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Верифицируем токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'BOMBA');
      
      // Добавляем информацию о пользователе в объект запроса
      req.user = decoded;
      
      next();
    } catch (err) {
      // Отдельно обрабатываем ошибку истекшего токена
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Срок действия токена истек. Пожалуйста, войдите в систему заново',
          tokenExpired: true
        });
      }
      
      // Другие ошибки токена
      return res.status(401).json({ error: 'Неверный токен авторизации' });
    }
  } catch (err) {
    console.error('Ошибка аутентификации:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке аутентификации' });
  }
};