const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не предоставлен токен авторизации' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'BOMBA');
    
    // Добавляем информацию о пользователе в объект запроса
    req.user = decoded;
    
    next();
  } catch (err) {
    console.error('Ошибка аутентификации:', err);
    return res.status(401).json({ error: 'Неверный токен авторизации' });
  }
};