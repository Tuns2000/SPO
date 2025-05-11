const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Маршруты
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const scheduleRoutes = require('./routes/schedule');

app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/schedule', scheduleRoutes);

// Тестовый маршрут
app.get('/', (req, res) => {
  res.send('API сервера работает!');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
