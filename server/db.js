const { Pool } = require('pg');
require('dotenv').config();

// Создаем подключение к базе данных
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'SPO',
  password: process.env.DB_PASSWORD || 'ArtemB1998',
  port: process.env.DB_PORT || 5432,
});

// Проверка соединения
pool.connect()
  .then(() => console.log('Успешное подключение к PostgreSQL'))
  .catch(err => console.error('Ошибка подключения к PostgreSQL:', err));

// Экспортируем pool как модуль
module.exports = pool;
