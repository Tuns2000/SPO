const db = require('./database');

async function initDB() {
  try {
    // Проверка существования таблиц и их колонок
    const checkUsersTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);
    
    const usersTableExists = checkUsersTable.rows[0].exists;
    
    if (usersTableExists) {
      console.log('Таблица users уже существует, проверяем наличие столбца role');
      
      // Проверяем существование столбца role
      const checkRoleColumn = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
        );
      `);
      
      if (!checkRoleColumn.rows[0].exists) {
        console.log('Добавляем столбец role в таблицу users');
        await db.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'client';`);
      }
    } else {
      // Создание таблицы пользователей с полем роли
      await db.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'client',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Проверка и создание таблицы групп
    await db.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL,
        description TEXT,
        coach_id INTEGER REFERENCES users(id)
      );
    `);

    // Проверка и создание таблицы записи в группу
    await db.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        group_id INTEGER REFERENCES groups(id),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        UNIQUE(user_id, group_id)
      );
    `);

    // Проверка и создание таблицы расписаний
    await db.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY, 
        group_id INTEGER REFERENCES groups(id),
        date DATE NOT NULL,
        time TIME NOT NULL,
        UNIQUE(group_id, date, time)
      );
    `);

    // Проверка таблицы subscriptions
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        description VARCHAR(255),
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        active BOOLEAN DEFAULT TRUE
      );
    `);

    // Создание таблицы для статистики и отчетов
    await db.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        record_date DATE DEFAULT CURRENT_DATE UNIQUE,
        subscriptions_sold INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        visitors_count INTEGER DEFAULT 0
      );
    `);

    // Создание таблицы уведомлений (для паттерна Observer)
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('База данных успешно инициализирована');

    // Добавляем тестовые данные
    await addTestData();
  } catch (err) {
    console.error('Ошибка инициализации базы данных:', err);
  }
}

async function addTestData() {
  try {
    // 1. Тестовые пользователи (admin, coach, client)
    await db.query(`
      INSERT INTO users (name, email, password, role) VALUES
      ('Администратор', 'admin@example.com', '$2b$10$8NhYsJ6vMl2cFw1ec9omJOmveK0xV7VXnf/yiHEu7DoNhmMMYfvmi', 'admin'),
      ('Иванов Иван', 'coach@example.com', '$2b$10$8NhYsJ6vMl2cFw1ec9omJOmveK0xV7VXnf/yiHEu7DoNhmMMYfvmi', 'coach'),
      ('Петров Петр', 'client@example.com', '$2b$10$8NhYsJ6vMl2cFw1ec9omJOmveK0xV7VXnf/yiHEu7DoNhmMMYfvmi', 'client')
      ON CONFLICT (email) DO NOTHING;
    `);

    // 2. Добавляем тренера
    await db.query(`
      INSERT INTO coaches (user_id, specialty, experience, rating, description)
      SELECT id, 'Плавание', 5, 4.8, 'Мастер спорта по плаванию'
      FROM users WHERE email = 'coach@example.com' AND NOT EXISTS (
        SELECT 1 FROM coaches WHERE user_id = (SELECT id FROM users WHERE email = 'coach@example.com')
      );
    `);

    // 3. Создаем группы
    await db.query(`
      INSERT INTO groups (name, coach_id, capacity, description)
      SELECT 'Начальное плавание', c.id, 15, 'Группа для начинающих'
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      WHERE u.email = 'coach@example.com'
      AND NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Начальное плавание')
      LIMIT 1;
      
      INSERT INTO groups (name, coach_id, capacity, description)
      SELECT 'Продвинутое плавание', c.id, 10, 'Группа для опытных пловцов'
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      WHERE u.email = 'coach@example.com'
      AND NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Продвинутое плавание')
      LIMIT 1;
    `);

    // 4. Добавляем расписание
    await db.query(`
      INSERT INTO schedules (group_id, date, time)
      SELECT g.id, CURRENT_DATE, '10:00'
      FROM groups g
      WHERE g.name = 'Начальное плавание'
      AND NOT EXISTS (
        SELECT 1 FROM schedules 
        WHERE group_id = g.id AND date = CURRENT_DATE AND time = '10:00'
      );
      
      INSERT INTO schedules (group_id, date, time)
      SELECT g.id, CURRENT_DATE, '18:00'
      FROM groups g
      WHERE g.name = 'Продвинутое плавание'
      AND NOT EXISTS (
        SELECT 1 FROM schedules 
        WHERE group_id = g.id AND date = CURRENT_DATE AND time = '18:00'
      );
    `);
    
    console.log('Тестовые данные успешно добавлены');
  } catch (err) {
    console.error('Ошибка при добавлении тестовых данных:', err);
  }
}

async function createTables() {
  // Создание таблицы subscriptions с правильной структурой
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      description VARCHAR(255),
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      active BOOLEAN DEFAULT TRUE
    );
  `);
}

module.exports = { initDB };