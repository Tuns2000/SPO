const pool = require('../db');

async function addDescriptionColumn() {
  try {
    // Проверяем, существует ли столбец description
    const checkResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'subscriptions' AND column_name = 'description'
    `);

    // Если столбца нет, добавляем его
    if (checkResult.rows.length === 0) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN description VARCHAR(255)
      `);
      console.log('Столбец description успешно добавлен в таблицу subscriptions');
    } else {
      console.log('Столбец description уже существует в таблице subscriptions');
    }
  } catch (err) {
    console.error('Ошибка при добавлении столбца description:', err);
  }
}

module.exports = { addDescriptionColumn };