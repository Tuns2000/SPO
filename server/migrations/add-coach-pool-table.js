const pool = require('../db');

async function addCoachPoolTable() {
  try {
    console.log('Создание таблицы связей тренеров и бассейнов...');
    
    // Проверка наличия колонки pool_id в таблице coaches
    const coachesPoolColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'coaches' AND column_name = 'pool_id'
      );
    `);
    
    if (!coachesPoolColumn.rows[0].exists) {
      // Добавляем колонку pool_id в таблицу coaches
      await pool.query(`
        ALTER TABLE coaches 
        ADD COLUMN pool_id INTEGER REFERENCES pools(id);
      `);
      console.log('Добавлена колонка pool_id в таблицу coaches');
    } else {
      console.log('Колонка pool_id в таблице coaches уже существует');
    }
    
    // Проверка наличия таблицы coach_pool
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'coach_pool'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      // Создаем таблицу связей тренер-бассейн
      await pool.query(`
        CREATE TABLE coach_pool (
          id SERIAL PRIMARY KEY,
          coach_id INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
          pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(coach_id, pool_id)
        );
      `);
      console.log('Таблица coach_pool успешно создана');
      
      // Заполняем таблицу coach_pool данными из coaches.pool_id
      await pool.query(`
        INSERT INTO coach_pool (coach_id, pool_id)
        SELECT id, pool_id FROM coaches 
        WHERE pool_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      `);
      console.log('Данные перенесены в таблицу coach_pool');
    } else {
      console.log('Таблица coach_pool уже существует');
    }
    
    // Добавляем колонку price_per_session в таблицу coaches, если её нет
    const priceColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'coaches' AND column_name = 'price_per_session'
      );
    `);
    
    if (!priceColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE coaches 
        ADD COLUMN price_per_session DECIMAL(10,2) DEFAULT 1000.00;
      `);
      console.log('Добавлена колонка price_per_session в таблицу coaches');
    } else {
      console.log('Колонка price_per_session в таблице coaches уже существует');
    }
    
    // Добавляем колонку coach_id в таблицу subscriptions
    const coachSubsColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'coach_id'
      );
    `);
    
    if (!coachSubsColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN coach_id INTEGER REFERENCES coaches(id);
      `);
      console.log('Добавлена колонка coach_id в таблицу subscriptions');
    } else {
      console.log('Колонка coach_id в таблице subscriptions уже существует');
    }
    
    // Добавляем колонку personal_trainer в таблицу subscriptions
    const personalTrainerCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'personal_trainer'
      );
    `);
    
    if (!personalTrainerCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN personal_trainer BOOLEAN DEFAULT FALSE;
      `);
      console.log('Добавлена колонка personal_trainer в таблицу subscriptions');
    } else {
      console.log('Колонка personal_trainer в таблице subscriptions уже существует');
    }
    
    // Добавляем колонку pool_id в таблицу subscriptions
    const poolSubsColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'pool_id'
      );
    `);
    
    if (!poolSubsColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN pool_id INTEGER REFERENCES pools(id);
      `);
      console.log('Добавлена колонка pool_id в таблицу subscriptions');
    } else {
      console.log('Колонка pool_id в таблице subscriptions уже существует');
    }
    
    console.log('Миграция завершена успешно');
  } catch (err) {
    console.error('Ошибка при создании таблицы связей тренеров и бассейнов:', err);
  }
}

module.exports = { addCoachPoolTable };