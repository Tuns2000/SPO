const express = require('express');
const router = express.Router();
const db = require('../db');

// Получение всех расписаний
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM schedules ORDER BY time');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении расписания' });
  }
});

module.exports = router;
