const pool = require('../db');
const logger = require('../utils/logger');

const addDayOfWeekColumn = async () => {
  try {
    logger.info('Проверка и добавление столбца day_of_week в таблицы расписания');
    
    // Проверяем таблицу schedule
    const scheduleExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schedule'
      );
    `);
    
    if (scheduleExists.rows[0].exists) {
      const columnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'schedule' AND column_name = 'day_of_week'
        );
      `);
      
      if (!columnExists.rows[0].exists) {
        await pool.query(`ALTER TABLE schedule ADD COLUMN day_of_week INTEGER`);
        logger.info('Столбец day_of_week добавлен в таблицу schedule');
        
        // Заполняем день недели на основе даты, если она есть
        const hasDateColumn = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'schedule' AND column_name = 'date'
          );
        `);
        
        if (hasDateColumn.rows[0].exists) {
          await pool.query(`
            UPDATE schedule 
            SET day_of_week = EXTRACT(DOW FROM date) + 1 
            WHERE date IS NOT NULL
          `);
          logger.info('Значения day_of_week заполнены на основе столбца date');
        }
      }
    }
    
    // Проверяем таблицу schedules
    const schedulesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schedules'
      );
    `);
    
    if (schedulesExists.rows[0].exists) {
      const columnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'schedules' AND column_name = 'day_of_week'
        );
      `);
      
      if (!columnExists.rows[0].exists) {
        await pool.query(`ALTER TABLE schedules ADD COLUMN day_of_week INTEGER`);
        logger.info('Столбец day_of_week добавлен в таблицу schedules');
      }
    }
    
    logger.info('Проверка и добавление столбца day_of_week завершены');
  } catch (err) {
    logger.error('Ошибка при добавлении столбца day_of_week:', err);
    throw err;
  }
};

module.exports = { addDayOfWeekColumn };