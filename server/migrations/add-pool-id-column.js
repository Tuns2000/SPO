const pool = require('../db');

async function addPoolIdColumn() {
  try {
    // Проверяем, существует ли столбец pool_id в таблице coaches
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'coaches' AND column_name = 'pool_id'
    `);

    if (checkResult.rows.length === 0) {
      // Столбец не существует, добавляем его
      await pool.query(`
        ALTER TABLE coaches 
        ADD COLUMN pool_id INTEGER REFERENCES pools(id)
      `);
      console.log('Столбец pool_id успешно добавлен в таблицу coaches');
    } else {
      console.log('Столбец pool_id уже существует в таблице coaches');
    }

    return true;
  } catch (err) {
    console.error('Ошибка при добавлении столбца pool_id:', err);
    return false;
  }
}

module.exports = { addPoolIdColumn };