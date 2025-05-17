const pool = require('../db');

async function addPoolIdToGroups() {
  try {
    // Проверяем, существует ли столбец pool_id в таблице groups
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'groups' AND column_name = 'pool_id'
    `);

    if (checkResult.rows.length === 0) {
      // Столбец не существует, добавляем его
      await pool.query(`
        ALTER TABLE groups 
        ADD COLUMN pool_id INTEGER REFERENCES pools(id)
      `);
      console.log('Столбец pool_id успешно добавлен в таблицу groups');
    } else {
      console.log('Столбец pool_id уже существует в таблице groups');
    }

    return true;
  } catch (err) {
    console.error('Ошибка при добавлении столбца pool_id в таблицу groups:', err);
    return false;
  }
}

module.exports = { addPoolIdToGroups };