const pool = require('../db');

async function addScheduleTable() {
  try {
    // Проверка существования таблицы
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schedule'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Создание таблицы расписания
      await pool.query(`
        CREATE TABLE schedule (
          id SERIAL PRIMARY KEY,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
          day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          pool_id INTEGER REFERENCES pools(id) ON DELETE SET NULL,
          max_participants INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CHECK (start_time < end_time)
        )
      `);

      // Создание таблицы для записей на занятия
      await pool.query(`
        CREATE TABLE schedule_enrollments (
          id SERIAL PRIMARY KEY,
          schedule_id INTEGER REFERENCES schedule(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          UNIQUE(schedule_id, user_id)
        )
      `);

      console.log('Таблицы расписания и записей на занятия успешно созданы');
    } else {
      console.log('Таблица расписания уже существует');
    }
  } catch (err) {
    console.error('Ошибка при создании таблицы расписания:', err);
    throw err;
  }
}

module.exports = { addScheduleTable };

// Если файл запущен напрямую, выполняем миграцию
if (require.main === module) {
  addScheduleTable().then(() => {
    console.log('Миграция завершена');
    process.exit(0);
  }).catch(err => {
    console.error('Ошибка миграции:', err);
    process.exit(1);
  });
}