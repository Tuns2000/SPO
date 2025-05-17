const pool = require('../db');

async function addCategoryColumn() {
  try {
    // Проверяем, существует ли столбец category
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'groups' AND column_name = 'category'
      );
    `);

    // Если столбец не существует, добавляем его
    if (!columnExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE groups 
        ADD COLUMN category VARCHAR(50),
        ADD CONSTRAINT check_category CHECK (category IN ('beginners', 'teenagers', 'adults', 'athletes'))
      `);
      console.log('Столбец category успешно добавлен в таблицу groups');
    } else {
      console.log('Столбец category уже существует в таблице groups');
    }
  } catch (err) {
    console.error('Ошибка при добавлении столбца category:', err);
  }
}

module.exports = { addCategoryColumn };

// Если файл запущен напрямую, выполняем миграцию
if (require.main === module) {
  addCategoryColumn().then(() => {
    console.log('Миграция завершена');
    process.exit(0);
  }).catch(err => {
    console.error('Ошибка миграции:', err);
    process.exit(1);
  });
}