const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Получение всех уведомлений пользователя
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, title, message, created_at, is_read
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении уведомлений:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Маршрут для отметки уведомления как прочитанное
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    // Проверяем, принадлежит ли уведомление пользователю
    const checkResult = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }
    
    // Отмечаем как прочитанное
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [notificationId]
    );
    
    res.json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (err) {
    console.error('Ошибка при обновлении статуса уведомления:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;