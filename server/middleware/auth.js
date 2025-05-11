const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ваш_секретный_ключ';

function authMiddleware(req, res, next) {
  // Получение токена из заголовка
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Доступ запрещен, отсутствует токен' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Верификация токена
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Добавляем информацию пользователя в объект запроса
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

module.exports = authMiddleware;