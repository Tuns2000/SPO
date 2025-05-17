const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { verifyToken } = require('../middleware/auth');

// Получение всего расписания (публичный доступ)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT s.*, 
             g.name AS group_name, g.description AS group_description, g.category,
             p.name AS pool_name, p.address AS pool_address,
             c.id AS coach_id,
             u.name AS coach_name,
             (SELECT COUNT(*) FROM schedule_enrollments se WHERE se.schedule_id = s.id AND se.status = 'active') AS enrolled_count
      FROM schedule s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE s.status = 'active'
      ORDER BY s.day_of_week, s.start_time
    `;
    
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении расписания:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение доступных занятий в расписании для записи
router.get('/available', async (req, res) => {
  try {
    const query = `
      SELECT s.*, 
             g.name AS group_name, g.description AS group_description, g.category,
             p.name AS pool_name, p.address AS pool_address,
             u.name AS coach_name,
             (SELECT COUNT(*) FROM schedule_enrollments se WHERE se.schedule_id = s.id AND se.status = 'active') AS enrolled_count
      FROM schedule s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE s.status = 'active' 
      AND (s.max_participants IS NULL OR (
          SELECT COUNT(*) FROM schedule_enrollments se 
          WHERE se.schedule_id = s.id AND se.status = 'active'
        ) < s.max_participants)
      ORDER BY s.day_of_week, s.start_time
    `;
    
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении доступных занятий:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Запись пользователя на занятие
router.post('/enroll/:scheduleId', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user.id;
    
    // Проверка существования занятия
    const scheduleCheck = await pool.query(
      'SELECT * FROM schedule WHERE id = $1 AND status = $2',
      [scheduleId, 'active']
    );
    
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Занятие не найдено или не активно' });
    }
    
    // Проверка, не записан ли уже пользователь
    const enrollmentCheck = await pool.query(
      'SELECT * FROM schedule_enrollments WHERE schedule_id = $1 AND user_id = $2 AND status = $3',
      [scheduleId, userId, 'active']
    );
    
    if (enrollmentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже записаны на это занятие' });
    }
    
    // Проверка, есть ли свободные места
    const schedule = scheduleCheck.rows[0];
    if (schedule.max_participants) {
      const enrolledCountResult = await pool.query(
        'SELECT COUNT(*) FROM schedule_enrollments WHERE schedule_id = $1 AND status = $2',
        [scheduleId, 'active']
      );
      
      const enrolledCount = parseInt(enrolledCountResult.rows[0].count, 10);
      if (enrolledCount >= schedule.max_participants) {
        return res.status(400).json({ error: 'Нет свободных мест на это занятие' });
      }
    }
    
    // Запись пользователя на занятие
    await pool.query(
      'INSERT INTO schedule_enrollments (schedule_id, user_id) VALUES ($1, $2)',
      [scheduleId, userId]
    );
    
    res.json({ message: 'Вы успешно записаны на занятие' });
  } catch (err) {
    console.error('Ошибка при записи на занятие:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отмена записи пользователя на занятие
router.delete('/enroll/:scheduleId', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user.id;
    
    // Проверка существования записи
    const enrollmentCheck = await pool.query(
      'SELECT * FROM schedule_enrollments WHERE schedule_id = $1 AND user_id = $2',
      [scheduleId, userId]
    );
    
    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Вы не записаны на это занятие' });
    }
    
    // Отмена записи
    await pool.query(
      'UPDATE schedule_enrollments SET status = $1 WHERE schedule_id = $2 AND user_id = $3',
      ['cancelled', scheduleId, userId]
    );
    
    res.json({ message: 'Запись на занятие отменена' });
  } catch (err) {
    console.error('Ошибка при отмене записи:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение записей пользователя на занятия
router.get('/my-enrollments', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT se.*, 
             s.day_of_week, s.start_time, s.end_time,
             g.name AS group_name,
             p.name AS pool_name,
             u.name AS coach_name
      FROM schedule_enrollments se
      JOIN schedule s ON se.schedule_id = s.id
      JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE se.user_id = $1 AND se.status = $2
      ORDER BY s.day_of_week, s.start_time
    `;
    
    const result = await pool.query(query, [userId, 'active']);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении записей пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
