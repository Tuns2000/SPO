const logger = require('../utils/logger');

/**
 * Middleware для логирования HTTP-запросов
 */
module.exports = (req, res, next) => {
  // Сохраняем оригинальный метод res.send
  const originalSend = res.send;
  
  // Запоминаем время начала запроса
  req.startTime = Date.now();
  
  // Переопределяем метод send для перехвата ответа
  res.send = function(body) {
    const responseTime = Date.now() - req.startTime;
    
    // Логируем информацию о запросе
    logger.access(req, res.statusCode);
    
    // Если запрос занял больше 1 секунды, логируем предупреждение
    if (responseTime > 1000) {
      logger.warn(`Медленный запрос: ${req.method} ${req.originalUrl}`, {
        responseTime: `${responseTime}ms`
      });
    }
    
    // Вызываем оригинальный метод send
    originalSend.call(this, body);
  };
  
  next();
};