const express = require('express');
const router = express.Router();
const db = require('../models/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const { NotificationService } = require('../models/notification-observer');

const notificationService = new NotificationService();

// Получение списка тренеров (общедоступный)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.id, u.name, c.specialty, c.experience, c.rating, c.description
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.rating DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении списка тренеров' });
  }
});

// Получение информации о конкретном тренере
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(`
      SELECT c.id, u.name, c.specialty, c.experience, c.rating, c.description
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Тренер не найден' });
    }
    
    // Получаем группы тренера
    const groupsResult = await db.query(`
      SELECT g.id, g.name, g.capacity, g.description, 
             COUNT(ge.id) as enrolled_count
      FROM groups g
      LEFT JOIN group_enrollments ge ON g.group_id = ge.group_id AND ge.status = 'active'
      WHERE g.coach_id = $1
      GROUP BY g.id
      ORDER BY g.name
    `, [id]);
    
    const coach = result.rows[0];
    coach.groups = groupsResult.rows;
    
    res.json(coach);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении информации о тренере' });
  }
});

// Создание профиля тренера (только для админа)
router.post('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const { userId, specialty, experience, description } = req.body;
  
  try {
    // Проверка, что пользователь существует и еще не является тренером
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    // Проверка, что пользователь еще не является тренером
    const coachCheck = await db.query('SELECT * FROM coaches WHERE user_id = $1', [userId]);
    if (coachCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже является тренером' });
    }
    
    // Обновление роли пользователя
    await db.query('UPDATE users SET role = $1 WHERE id = $2', ['coach', userId]);
    
    // Создание профиля тренера
    const result = await db.query(
      'INSERT INTO coaches (user_id, specialty, experience, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, specialty, experience, description]
    );
    
    // Уведомление пользователю о назначении тренером
    await notificationService.notifyUser(
      userId,
      'Назначение тренером',
      'Вам предоставлена роль тренера. Теперь у вас есть доступ к дополнительным функциям.'
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при создании профиля тренера' });
  }
});

// Получение групп тренера (для авторизованного тренера)
router.get('/my/groups', authMiddleware, roleMiddleware(['coach']), async (req, res) => {
  try {
    // Получаем ID профиля тренера
    const coachProfile = await db.query('SELECT id FROM coaches WHERE user_id = $1', [req.user.id]);
    
    if (coachProfile.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachProfile.rows[0].id;
    
    // Получаем группы тренера с количеством участников
    const result = await db.query(`
      SELECT g.id, g.name, g.capacity, g.description,
             COUNT(ge.id) as enrolled_count
      FROM groups g
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id AND ge.status = 'active'
      WHERE g.coach_id = $1
      GROUP BY g.id
      ORDER BY g.name
    `, [coachId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении групп тренера' });
  }
});

// Получение расписания тренера
router.get('/my/schedule', authMiddleware, roleMiddleware(['coach']), async (req, res) => {
  try {
    // Получаем ID профиля тренера
    const coachProfile = await db.query('SELECT id FROM coaches WHERE user_id = $1', [req.user.id]);
    
    if (coachProfile.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachProfile.rows[0].id;
    
    // Получаем расписание для групп тренера
    const result = await db.query(`
      SELECT s.id, s.date, s.time, s.status, g.name as group_name, g.id as group_id
      FROM schedules s
      JOIN groups g ON s.group_id = g.id
      WHERE g.coach_id = $1 AND s.date >= CURRENT_DATE
      ORDER BY s.date, s.time
    `, [coachId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении расписания тренера' });
  }
});

module.exports = router;