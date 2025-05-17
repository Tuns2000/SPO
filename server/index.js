const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const helmet = require('helmet');
const { initDB } = require('./init-db');
const { addDescriptionColumn } = require('./migrations/add-description-column');
const { addPoolIdColumn } = require('./migrations/add-pool-id-column');
const { addVisitsPerWeekColumn } = require('./migrations/add-visits-per-week-column');
const { addPoolIdToGroups } = require('./migrations/add-pool-id-to-groups');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const swaggerOptions = require('./utils/swagger');
const logger = require('./utils/logger');

// Загружаем переменные окружения из файла .env
dotenv.config();
const app = express();

// Middleware для безопасности
app.use(helmet());

// Middleware для CORS
app.use(cors());

// Middleware для парсинга JSON
app.use(express.json());

// Логирование запросов
app.use(requestLogger);

// Создаём асинхронную функцию инициализации
async function initialize() {
  try {
    await initDB();
    await addDescriptionColumn();
    await addPoolIdColumn();
    await addVisitsPerWeekColumn();
    await addPoolIdToGroups();
    logger.info('База данных и миграции инициализированы');
  } catch (err) {
    logger.error('Ошибка при инициализации:', { error: err.message });
    process.exit(1);
  }
}

// Вызываем её
initialize();

// Документация API
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Подключаем маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/group', require('./routes/group'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/user', require('./routes/user'));
app.use('/api/notification', require('./routes/notification'));
app.use('/api/coach', require('./routes/coach'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/pools', require('./routes/pool'));
app.use('/api/admin', require('./routes/admin')); // Добавлено новое подключение маршрута

// Маршрут для проверки работоспособности сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер работает', timestamp: new Date().toISOString() });
});

// Обработка ошибок для несуществующих маршрутов
app.use((req, res, next) => {
  const error = new Error(`Маршрут ${req.originalUrl} не найден`);
  error.statusCode = 404;
  next(error);
});

// Middleware для обработки ошибок
app.use(errorHandler);

// Порт для сервера
const PORT = process.env.PORT || 3000;

// Запускаем сервер
app.listen(PORT, () => {
  logger.info(`Сервер запущен на порту ${PORT}`);
});

// Обработка непредвиденных ошибок
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', { error: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});
