const fs = require('fs');
const path = require('path');

/**
 * Простая система логирования
 */
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.errorLogPath = path.join(this.logDir, 'error.log');
    this.accessLogPath = path.join(this.logDir, 'access.log');
    this.appLogPath = path.join(this.logDir, 'app.log');
    
    // Создаем директорию для логов, если она не существует
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Форматирует сообщение для лога
   * @param {string} level - Уровень логирования
   * @param {string} message - Сообщение
   * @returns {string} - Форматированная строка лога
   */
  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    let metaString = '';
    
    if (Object.keys(meta).length > 0) {
      metaString = JSON.stringify(meta);
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}\n`;
  }

  /**
   * Записывает сообщение в лог-файл
   * @param {string} filePath - Путь к файлу лога
   * @param {string} message - Сообщение для записи
   */
  writeLog(filePath, message) {
    fs.appendFileSync(filePath, message);
  }

  /**
   * Логирует информационное сообщение
   * @param {string} message - Сообщение
   * @param {Object} meta - Дополнительные метаданные
   */
  info(message, meta = {}) {
    const logMessage = this.formatLog('info', message, meta);
    console.log(message, meta);
    this.writeLog(this.appLogPath, logMessage);
  }

  /**
   * Логирует предупреждение
   * @param {string} message - Сообщение
   * @param {Object} meta - Дополнительные метаданные
   */
  warn(message, meta = {}) {
    const logMessage = this.formatLog('warn', message, meta);
    console.warn(message, meta);
    this.writeLog(this.appLogPath, logMessage);
  }

  /**
   * Логирует ошибку
   * @param {string} message - Сообщение об ошибке
   * @param {Object} meta - Дополнительные метаданные
   */
  error(message, meta = {}) {
    const logMessage = this.formatLog('error', message, meta);
    console.error(message, meta);
    this.writeLog(this.errorLogPath, logMessage);
    this.writeLog(this.appLogPath, logMessage);
  }

  /**
   * Логирует доступ к API
   * @param {Object} req - Объект запроса Express
   * @param {number} statusCode - HTTP-статус ответа
   */
  access(req, statusCode) {
    const { method, originalUrl, ip } = req;
    const timestamp = new Date().toISOString();
    const userId = req.user ? req.user.id : 'unauthorized';
    
    const logMessage = `[${timestamp}] [${method}] ${originalUrl} - ${statusCode} - ${ip} - User: ${userId}\n`;
    this.writeLog(this.accessLogPath, logMessage);
  }
}

module.exports = new Logger();