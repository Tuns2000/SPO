const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Защищенный маршрут с проверкой аутентификации
router.post('/', authMiddleware, async (req, res) => {
  const { type, price } = req.body;
  const userId = req.user.id; // Получаем ID пользователя из токена

  try {
    // Создание абонемента в БД
    const result = await db.query(
      'INSERT INTO subscriptions (user_id, type, price, start_date, end_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL \'30 day\') RETURNING *',
      [userId, type, price]
    );

    res.json({ 
      message: 'Абонемент успешно оформлен', 
      subscription: result.rows[0] 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при создании абонемента' });
  }
});

// Получение абонементов пользователя
router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY start_date DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении абонементов' });
  }
});

module.exports = router;
