const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Получение всех расписаний
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id, s.date, s.time, s.status, 
             g.id as group_id, g.name as group_name, 
             u.name as coach
      FROM schedules s
      JOIN groups g ON s.group_id = g.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE s.date >= CURRENT_DATE
      ORDER BY s.date, s.time
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении расписания' });
  }
});

module.exports = router;
