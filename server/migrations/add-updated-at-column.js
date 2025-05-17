const pool = require('../db');

async function addUpdatedAtColumn() {
  try {
    // Проверка существования столбца updated_at в таблице subscriptions
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
      );
    `);
    
    // Если столбец не существует, добавляем его
    if (!columnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('Столбец updated_at добавлен в таблицу subscriptions');
    } else {
      console.log('Столбец updated_at уже существует в таблице subscriptions');
    }
  } catch (err) {
    console.error('Ошибка при добавлении столбца updated_at:', err);
  }
}

module.exports = { addUpdatedAtColumn };

// Если файл запущен напрямую, выполняем миграцию
if (require.main === module) {
  addUpdatedAtColumn().then(() => {
    console.log('Миграция успешно выполнена');
    process.exit(0);
  }).catch(err => {
    console.error('Ошибка при выполнении миграции:', err);
    process.exit(1);
  });
}