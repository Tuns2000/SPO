const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Загружаем переменные окружения из файла .env
dotenv.config();

// Правильный импорт функции initDB
const { initDB } = require('./models/init-db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация базы данных
initDB();

// Подключаем маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/group', require('./routes/group'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/user', require('./routes/user'));
app.use('/api/notification', require('./routes/notification'));
app.use('/api/coach', require('./routes/coach'));
app.use('/api/schedule', require('./routes/schedule'));

// Порт для сервера
const PORT = process.env.PORT || 3000;

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
