const pool = require('./db');

async function initDB() {
  try {
    // Создание таблицы бассейнов, если еще не создана
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('sport', 'health', 'combined')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // Создание таблицы тренеров
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coaches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        specialty VARCHAR(255),
        experience INTEGER DEFAULT 0,
        rating NUMERIC(3,2) DEFAULT 0,
        description TEXT,
        pool_id INTEGER REFERENCES pools(id)
      );
    `);

    // Создание таблицы абонементов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        visits_per_week INTEGER CHECK (visits_per_week IN (1, 2, 3, 5)),
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

    // Создание таблицы групп
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL,
        description TEXT,
        coach_id INTEGER REFERENCES users(id),
        pool_id INTEGER REFERENCES pools(id),
        category VARCHAR(50) CHECK (category IN ('beginners', 'teenagers', 'adults', 'athletes'))
      );
    `);

    // Создание таблицы записей в группы
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        group_id INTEGER REFERENCES groups(id),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active',
        UNIQUE(user_id, group_id)
      );
    `);

    // Создание таблицы уведомлений, если еще не создана
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT false
      );
    `);

    console.log('База данных успешно инициализирована');

    // Проверяем, существуют ли уже бассейны
    const poolsCheck = await pool.query(`SELECT COUNT(*) FROM pools`);
    
    // Добавляем тестовые бассейны только если их нет в таблице
    if (poolsCheck.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO pools (name, address, type) VALUES
        ('Олимп', 'ул. Спортивная, 1', 'sport'),
        ('Здоровье', 'ул. Оздоровительная, 10', 'health'),
        ('Водолей', 'ул. Центральная, 5', 'combined')
        ON CONFLICT DO NOTHING;
      `);
      console.log('Добавлены тестовые бассейны');
    } else {
      console.log('Тестовые бассейны уже существуют');
    }

    // Добавляем pool_id к существующим группам
    await pool.query(`
      UPDATE groups 
      SET pool_id = 1 
      WHERE pool_id IS NULL
    `);
  } catch (err) {
    console.error('Ошибка инициализации базы данных:', err);
  }
}

// Экспортируем функцию для использования в index.js
module.exports = { initDB };

// Если этот файл запущен напрямую, выполняем инициализацию
if (require.main === module) {
  initDB().then(() => {
    console.log('Инициализация базы данных завершена');
    process.exit(0);
  }).catch(err => {
    console.error('Ошибка при инициализации:', err);
    process.exit(1);
  });
}