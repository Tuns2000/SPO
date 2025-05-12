const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Маршрут для получения групп, в которые записан пользователь
router.get('/enrollments', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
         g.id as group_id,
         g.name as group_name,
         CONCAT(u.name) as coach_name,
         ge.enrollment_date
       FROM group_enrollments ge
       JOIN groups g ON ge.group_id = g.id
       JOIN coaches c ON g.coach_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE ge.user_id = $1
       ORDER BY ge.enrollment_date DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении записей в группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;