const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware для проверки JWT токена
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'BOMBA');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Ошибка верификации токена:', err);
    return res.status(403).json({ error: 'Недействительный или просроченный токен' });
  }
};

module.exports = { verifyToken };  // Экспортируем объект с функцией