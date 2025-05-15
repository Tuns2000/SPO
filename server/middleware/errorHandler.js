const logger = require('../utils/logger');

/**
 * Middleware для централизованной обработки ошибок
 */
module.exports = (err, req, res, next) => {
  // Определяем код статуса ответа
  const statusCode = err.statusCode || 500;
  
  // Логируем ошибку
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user.id : 'unauthorized'
  });
  
  // В продакшене не раскрываем детали ошибок клиенту
  const isProd = process.env.NODE_ENV === 'production';
  
  // Отправляем ответ с ошибкой
  res.status(statusCode).json({
    error: isProd ? 'Внутренняя ошибка сервера' : err.message,
    stack: isProd ? undefined : err.stack
  });
};