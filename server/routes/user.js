const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth'); // Импортируем verifyToken вместо всего модуля

// Создаем алиас для совместимости с существующим кодом
const authMiddleware = verifyToken;

// Обновляем маршрут для получения записей пользователя с информацией о бассейне
router.get('/enrollments', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const enrollments = await pool.query(`
      SELECT 
        g.id AS group_id,
        g.name AS group_name,
        u.name AS coach_name,
        p.name AS pool_name,
        p.address AS pool_address,
        TO_CHAR(ge.enrollment_date, 'DD.MM.YYYY') AS enrollment_date
      FROM group_enrollments ge
      JOIN groups g ON ge.group_id = g.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON g.pool_id = p.id
      WHERE ge.user_id = $1 AND ge.status = 'active'
      ORDER BY ge.enrollment_date DESC
    `, [userId]);
    
    res.json(enrollments.rows);
  } catch (err) {
    console.error('Ошибка при получении записей в группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавьте маршрут для отмены записи - также используем authMiddleware
router.delete('/enrollments/:groupId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    
    // Проверяем, есть ли запись
    const enrollmentCheck = await pool.query(
      `SELECT * FROM group_enrollments 
       WHERE user_id = $1 AND group_id = $2 AND status = 'active'`,
      [userId, groupId]
    );
    
    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    
    // Устанавливаем статус "cancelled"
    await pool.query(
      `UPDATE group_enrollments 
       SET status = 'cancelled' 
       WHERE user_id = $1 AND group_id = $2 AND status = 'active'`,
      [userId, groupId]
    );
    
    res.json({ message: 'Запись успешно отменена' });
    
  } catch (err) {
    console.error('Ошибка при отмене записи:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;