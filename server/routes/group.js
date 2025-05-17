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
  try {
    const groupId = req.params.id;
    
    // Запрос с JOIN-ами для получения данных о группе, тренере и бассейне
    const result = await db.query(`
      SELECT g.*, 
        u.name AS coach_name,
        p.id AS pool_id,
        p.name AS pool_name,
        p.address AS pool_address,
        p.type AS pool_type,
        COUNT(ge.id) FILTER (WHERE ge.status = 'active') AS enrolled_count
      FROM groups g
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON g.pool_id = p.id
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id
      WHERE g.id = $1
      GROUP BY g.id, u.name, p.id
    `, [groupId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при получении информации о группе:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
    
    // Проверяем, есть ли у пользователя абонемент
    const subscriptionCheck = await db.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND active = true AND end_date > CURRENT_TIMESTAMP`,
      [userId]
    );
    
    if (subscriptionCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'У вас нет активного абонемента', 
        errorCode: 'NO_SUBSCRIPTION' 
      });
    }
    
    // Проверяем, существует ли группа
    const groupCheck = await db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
    
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Группа не найдена', 
        errorCode: 'GROUP_NOT_FOUND' 
      });
    }
    
    // Проверяем, не исключен ли пользователь тренером
    const removedCheck = await db.query(
      `SELECT * FROM group_enrollments 
       WHERE user_id = $1 AND group_id = $2 AND status = 'removed_by_coach'`,
      [userId, groupId]
    );
    
    if (removedCheck.rows.length > 0) {
      return res.status(403).json({ 
        error: 'Вы не можете записаться в эту группу, так как были исключены тренером', 
        errorCode: 'REMOVED_BY_COACH' 
      });
    }
    
    // Проверяем, не записан ли пользователь уже
    const enrollmentCheck = await db.query(
      `SELECT * FROM group_enrollments 
       WHERE user_id = $1 AND group_id = $2 AND status = 'active'`,
      [userId, groupId]
    );
    
    if (enrollmentCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Вы уже записаны в эту группу', 
        errorCode: 'ALREADY_ENROLLED' 
      });
    }
    
    // Проверяем, есть ли места в группе
    const capacityCheck = await db.query(
      `SELECT g.capacity, COUNT(ge.id) as enrolled_count
       FROM groups g
       LEFT JOIN group_enrollments ge ON g.id = ge.group_id AND ge.status = 'active'
       WHERE g.id = $1
       GROUP BY g.id, g.capacity`,
      [groupId]
    );
    
    if (capacityCheck.rows.length > 0) {
      const { capacity, enrolled_count } = capacityCheck.rows[0];
      if (enrolled_count >= capacity) {
        return res.status(400).json({ 
          error: 'В группе нет свободных мест', 
          errorCode: 'NO_CAPACITY' 
        });
      }
    }
    
    // Проверяем, есть ли предыдущая запись (отмененная самим пользователем)
    const previousEnrollment = await db.query(
      `SELECT id FROM group_enrollments 
       WHERE user_id = $1 AND group_id = $2 AND status = 'cancelled'`,
      [userId, groupId]
    );
    
    if (previousEnrollment.rows.length > 0) {
      // Если пользователь сам отменил запись ранее, активируем её
      await db.query(
        `UPDATE group_enrollments 
         SET status = 'active', enrollment_date = CURRENT_DATE 
         WHERE id = $1`,
        [previousEnrollment.rows[0].id]
      );
    } else {
      // Создаем новую запись
      await db.query(
        `INSERT INTO group_enrollments (user_id, group_id, status) 
         VALUES ($1, $2, 'active')`,
        [userId, groupId]
      );
    }
    
    res.json({ message: 'Вы успешно записаны в группу' });
    
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

// Добавление группы в бассейн (только для админа)
router.post('/pool/:poolId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const poolId = req.params.poolId;
    const { name, coachId, capacity, category, description } = req.body;
    
    // Проверка существования бассейна
    const poolCheck = await db.query('SELECT * FROM pools WHERE id = $1', [poolId]);
    if (poolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Бассейн не найден' });
    }
    
    // Проверка категории группы
    if (!['beginners', 'teenagers', 'adults', 'athletes'].includes(category)) {
      return res.status(400).json({ error: 'Неверная категория группы' });
    }
    
    // Проверка существования тренера и его принадлежности к данному бассейну
    const coachCheck = await db.query(
      'SELECT * FROM coaches WHERE id = $1 AND pool_id = $2',
      [coachId, poolId]
    );
    if (coachCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Тренер не найден или не относится к указанному бассейну' });
    }
    
    // Создание группы
    const result = await db.query(
      `INSERT INTO groups (name, coach_id, capacity, description, category, pool_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, coachId, capacity, description, category, poolId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление группы из бассейна (только для админа)
router.delete('/pool/:poolId/:groupId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { poolId, groupId } = req.params;
    
    // Проверка существования группы в указанном бассейне
    const groupCheck = await db.query(
      'SELECT * FROM groups WHERE id = $1 AND pool_id = $2',
      [groupId, poolId]
    );
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена в указанном бассейне' });
    }
    
    // Отменяем все записи в эту группу
    await db.query(
      `UPDATE group_enrollments SET status = 'cancelled'
       WHERE group_id = $1 AND status = 'active'`,
      [groupId]
    );
    
    // Удаляем все расписания для группы
    await db.query(
      'DELETE FROM schedules WHERE group_id = $1',
      [groupId]
    );
    
    // Удаляем группу
    await db.query(
      'DELETE FROM groups WHERE id = $1',
      [groupId]
    );
    
    res.json({ message: 'Группа успешно удалена из бассейна' });
  } catch (err) {
    console.error('Ошибка при удалении группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;