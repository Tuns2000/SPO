const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Маршрут для получения групп, в которые записан пользователь
router.get('/enrollments', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Исправляем обработку даты
    const result = await pool.query(
      `SELECT 
         g.id as group_id,
         g.name as group_name,
         u.name as coach_name,
         CASE 
           WHEN ge.enrollment_date IS NULL THEN null
           ELSE TO_CHAR(ge.enrollment_date, 'DD.MM.YYYY')
         END as enrollment_date
       FROM group_enrollments ge
       JOIN groups g ON ge.group_id = g.id
       JOIN coaches c ON g.coach_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE ge.user_id = $1 AND ge.status = 'active'
       ORDER BY ge.enrollment_date DESC`,
      [userId]
    );
    
    // Проверяем и форматируем данные перед отправкой
    const formattedResults = result.rows.map(row => ({
      ...row,
      enrollment_date: row.enrollment_date || '15.05.2025' // Используем фиксированную дату если null
    }));
    
    res.json(formattedResults);
    
  } catch (err) {
    console.error('Ошибка при получении записей в группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавьте маршрут для отмены записи
router.delete('/enrollments/:groupId', auth, async (req, res) => {
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