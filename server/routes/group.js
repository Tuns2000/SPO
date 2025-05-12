const express = require('express');
const router = express.Router();
const db = require('../models/database');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const { NotificationService } = require('../models/notification-observer');

const notificationService = new NotificationService();

// Получение списка всех групп
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT g.*, c.specialty, u.name as coach_name, 
             COUNT(ge.id) as enrolled_count
      FROM groups g
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id AND ge.status = 'active'
      GROUP BY g.id, c.id, c.specialty, u.name
      ORDER BY g.name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении списка групп' });
  }
});

// Получение информации о конкретной группе
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(`
      SELECT g.*, c.specialty, u.name as coach_name, 
             COUNT(ge.id) as enrolled_count
      FROM groups g
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id AND ge.status = 'active'
      WHERE g.id = $1
      GROUP BY g.id, c.id, c.specialty, u.name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }
    
    // Получаем расписание для этой группы
    const scheduleResult = await db.query(`
      SELECT * FROM schedules
      WHERE group_id = $1 AND date >= CURRENT_DATE
      ORDER BY date, time
    `, [id]);
    
    const group = result.rows[0];
    group.schedule = scheduleResult.rows;
    
    res.json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении информации о группе' });
  }
});

// Создание новой группы (только для админа)
router.post('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const { name, coachId, capacity, description } = req.body;
  
  try {
    // Проверка существования тренера
    const coachCheck = await db.query('SELECT * FROM coaches WHERE id = $1', [coachId]);
    if (coachCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Тренер не найден' });
    }
    
    const result = await db.query(
      'INSERT INTO groups (name, coach_id, capacity, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, coachId, capacity, description]
    );
    
    // Уведомление тренеру о назначении на группу
    const coach = await db.query(
      'SELECT u.id FROM coaches c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
      [coachId]
    );
    
    if (coach.rows.length > 0) {
      await notificationService.notifyUser(
        coach.rows[0].id,
        'Новое назначение',
        `Вы назначены тренером группы "${name}".`
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при создании группы' });
  }
});

// Запись в группу (для авторизованных пользователей)
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    
    // Проверяем, есть ли у пользователя активный абонемент
    const subscriptionResult = await db.query(
      `SELECT id FROM subscriptions 
       WHERE user_id = $1 AND active = TRUE AND end_date >= CURRENT_DATE`,
      [userId]
    );
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Для записи в группу необходим активный абонемент'
      });
    }
    
    // Проверяем, есть ли свободные места в группе
    const groupResult = await db.query(
      `SELECT g.capacity, COUNT(ge.user_id) as enrolled_count
       FROM groups g
       LEFT JOIN group_enrollments ge ON g.id = ge.group_id
       WHERE g.id = $1
       GROUP BY g.capacity`,
      [groupId]
    );
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }
    
    const { capacity, enrolled_count } = groupResult.rows[0];
    
    if (parseInt(enrolled_count) >= parseInt(capacity)) {
      return res.status(400).json({ error: 'Группа уже заполнена' });
    }
    
    // Проверяем, не записан ли пользователь уже в эту группу
    const enrollmentCheck = await db.query(
      'SELECT id FROM group_enrollments WHERE user_id = $1 AND group_id = $2',
      [userId, groupId]
    );
    
    if (enrollmentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже записаны в эту группу' });
    }
    
    // Записываем пользователя в группу
    await db.query(
      'INSERT INTO group_enrollments (user_id, group_id, enrollment_date) VALUES ($1, $2, CURRENT_DATE)',
      [userId, groupId]
    );
    
    res.status(201).json({ message: 'Вы успешно записаны в группу' });
  } catch (err) {
    console.error('Ошибка при записи в группу:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение списка участников группы (для тренера и админа)
router.get('/:id/members', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    // Проверка прав - пользователь должен быть админом или тренером этой группы
    if (req.user.role !== 'admin') {
      const coachCheck = await db.query(`
        SELECT * FROM groups g
        JOIN coaches c ON g.coach_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE g.id = $1 AND u.id = $2
      `, [id, userId]);
      
      if (coachCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }
    
    // Получаем участников группы
    const result = await db.query(`
      SELECT u.id, u.name, u.email, ge.enrollment_date, ge.status
      FROM group_enrollments ge
      JOIN users u ON ge.user_id = u.id
      WHERE ge.group_id = $1 AND ge.status = 'active'
      ORDER BY ge.enrollment_date
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении списка участников' });
  }
});

// Отмена записи в группу
router.delete('/:groupId/enroll', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // Проверка существования записи
    const enrollmentCheck = await db.query(
      'SELECT * FROM group_enrollments WHERE user_id = $1 AND group_id = $2 AND status = $3',
      [userId, groupId, 'active']
    );
    
    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    
    // Отмена записи
    await db.query(
      'UPDATE group_enrollments SET status = $1 WHERE user_id = $2 AND group_id = $3',
      ['cancelled', userId, groupId]
    );
    
    // Получение информации о группе для уведомления
    const groupInfo = await db.query('SELECT name FROM groups WHERE id = $1', [groupId]);
    const groupName = groupInfo.rows.length > 0 ? groupInfo.rows[0].name : 'группу';
    
    // Уведомление пользователю
    await notificationService.notifyUser(
      userId,
      'Отмена записи',
      `Вы отменили запись в ${groupName}.`
    );
    
    res.json({ message: 'Запись отменена' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при отмене записи' });
  }
});

module.exports = router;