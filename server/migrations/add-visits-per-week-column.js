const pool = require('../db');

async function addVisitsPerWeekColumn() {
  try {
    // Проверяем, существует ли столбец visits_per_week
    const checkResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'subscriptions' AND column_name = 'visits_per_week'
    `);

    // Если столбца нет, добавляем его
    if (checkResult.rows.length === 0) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN visits_per_week INTEGER CHECK (visits_per_week IN (1, 2, 3, 5))
      `);
      console.log('Столбец visits_per_week успешно добавлен в таблицу subscriptions');
    } else {
      console.log('Столбец visits_per_week уже существует в таблице subscriptions');
    }
    
    // Обновляем пустые значения
    await pool.query(`
      UPDATE subscriptions 
      SET visits_per_week = 1 
      WHERE visits_per_week IS NULL
    `);
    
    return true;
  } catch (err) {
    console.error('Ошибка при добавлении столбца visits_per_week:', err);
    return false;
  }
}

module.exports = { addVisitsPerWeekColumn };