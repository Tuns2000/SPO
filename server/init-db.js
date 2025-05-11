const pool = require('./db');

async function initDB() {
  try {
    // Создание таблицы пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание таблицы абонементов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        active BOOLEAN DEFAULT true
      );
    `);

    // Создание таблицы расписаний
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        time VARCHAR(50) NOT NULL,
        coach VARCHAR(100) NOT NULL
      );
    `);

    console.log('База данных успешно инициализирована');

    // Добавляем тестовые данные для расписания
    await pool.query(`
      INSERT INTO schedules (group_name, time, coach) VALUES
      ('Йога', '10:00', 'Иванов'),
      ('Плавание', '12:00', 'Петров')
      ON CONFLICT DO NOTHING;
    `);

  } catch (err) {
    console.error('Ошибка инициализации базы данных:', err);
  }
}

initDB();