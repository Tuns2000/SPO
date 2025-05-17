const express = require('express');
const router = express.Router();
const pool = require('../db');  // Правильный импорт pool
const { verifyToken } = require('../middleware/auth');
const { authorizeAdmin } = require('../middleware/role');

// Получение списка всех пользователей (только для админа)
router.get('/users', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении пользователей:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении списка пользователей' });
  }
});

// Получение общей статистики для админа
router.get('/stats', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    // Выполняем несколько запросов параллельно
    const [usersCount, groupsCount, subscriptionsCount, poolsCount, enrollmentsCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM groups'),
      pool.query('SELECT COUNT(*) FROM subscriptions'),
      pool.query('SELECT COUNT(*) FROM pools'),
      pool.query('SELECT COUNT(*) FROM group_enrollments WHERE status = $1', ['active'])
    ]);

    res.json({
      users: parseInt(usersCount.rows[0].count),
      groups: parseInt(groupsCount.rows[0].count),
      subscriptions: parseInt(subscriptionsCount.rows[0].count),
      pools: parseInt(poolsCount.rows[0].count),
      enrollments: parseInt(enrollmentsCount.rows[0].count)
    });
  } catch (err) {
    console.error('Ошибка при получении статистики:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении статистики' });
  }
});

// Получение списка тренеров
router.get('/coaches', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const query = `
      SELECT c.id, c.specialty, c.experience, c.rating, c.description,
             u.id AS user_id, u.name, u.email,
             p.id AS pool_id, p.name AS pool_name,
             COUNT(g.id) AS groups_count
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON c.pool_id = p.id
      LEFT JOIN groups g ON g.coach_id = c.id
      GROUP BY c.id, u.id, p.id
      ORDER BY u.name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка тренеров:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение списка групп
router.get('/groups', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const query = `
      SELECT g.*, 
             c.id AS coach_id, u.name AS coach_name, 
             p.name AS pool_name,
             COUNT(ge.id) FILTER (WHERE ge.status = 'active') AS enrolled_count
      FROM groups g
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON g.pool_id = p.id
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id
      GROUP BY g.id, c.id, u.name, p.name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении групп:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение расписания
router.get('/schedule', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const query = `
      SELECT s.id, s.date, s.time, s.status, 
             g.id as group_id, g.name as group_name, 
             u.name as coach_name,
             p.name as pool_name
      FROM schedules s
      JOIN groups g ON s.group_id = g.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON g.pool_id = p.id
      ORDER BY s.date, s.time
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении расписания:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление тренера
router.put('/coaches/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { specialty, experience, description, pool_id } = req.body;
    
    // Проверка существования тренера
    const coachResult = await pool.query('SELECT * FROM coaches WHERE id = $1', [id]);
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тренер не найден' });
    }
    
    // Обновление данных тренера
    const updateQuery = `
      UPDATE coaches 
      SET 
        specialty = COALESCE($1, specialty),
        experience = COALESCE($2, experience),
        description = COALESCE($3, description),
        pool_id = $4
      WHERE id = $5
      RETURNING *
    `;
    
    let poolIdParam = pool_id || null;
    const result = await pool.query(updateQuery, [
      specialty, 
      experience, 
      description, 
      poolIdParam,
      id
    ]);
    
    const coach = result.rows[0];
    
    // Получаем дополнительную информацию о тренере для ответа
    const coachDetailQuery = `
      SELECT c.*, u.name, u.email, p.name as pool_name
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON c.pool_id = p.id
      WHERE c.id = $1
    `;
    
    const detailResult = await pool.query(coachDetailQuery, [id]);
    
    res.json({ message: 'Тренер успешно обновлен', coach: detailResult.rows[0] });
  } catch (err) {
    console.error('Ошибка при обновлении тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление тренера
router.delete('/coaches/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка существования тренера
    const coachResult = await pool.query('SELECT * FROM coaches WHERE id = $1', [id]);
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тренер не найден' });
    }
    
    // Проверка, есть ли у тренера группы
    const groupsResult = await pool.query('SELECT COUNT(*) FROM groups WHERE coach_id = $1', [id]);
    
    if (parseInt(groupsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Невозможно удалить тренера, у которого есть группы. Сначала переназначьте группы другим тренерам.' 
      });
    }
    
    // Удаление тренера
    await pool.query('DELETE FROM coaches WHERE id = $1', [id]);
    
    res.json({ message: 'Тренер успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление группы
router.put('/groups/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, coach_id, pool_id, capacity, description, category } = req.body;
    
    // Проверка существования группы
    const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }
    
    // Проверка на существование тренера, если указан
    if (coach_id) {
      const coachResult = await pool.query('SELECT * FROM coaches WHERE id = $1', [coach_id]);
      if (coachResult.rows.length === 0) {
        return res.status(400).json({ error: 'Указанный тренер не существует' });
      }
    }
    
    // Проверка на существование бассейна, если указан
    if (pool_id) {
      const poolResult = await pool.query('SELECT * FROM pools WHERE id = $1', [pool_id]);
      if (poolResult.rows.length === 0) {
        return res.status(400).json({ error: 'Указанный бассейн не существует' });
      }
    }
    
    // Обновление данных группы
    const updateQuery = `
      UPDATE groups 
      SET 
        name = COALESCE($1, name),
        coach_id = $2,
        pool_id = $3,
        capacity = COALESCE($4, capacity),
        description = COALESCE($5, description),
        category = COALESCE($6, category)
      WHERE id = $7
      RETURNING *
    `;
    
    const coachIdParam = coach_id || null;
    const poolIdParam = pool_id || null;
    
    const result = await pool.query(updateQuery, [
      name, 
      coachIdParam, 
      poolIdParam, 
      capacity, 
      description, 
      category, 
      id
    ]);
    
    // Получаем подробную информацию о группе для ответа
    const groupDetailQuery = `
      SELECT g.*, 
             c.id AS coach_id, u.name AS coach_name, 
             p.name AS pool_name,
             COUNT(ge.id) FILTER (WHERE ge.status = 'active') AS enrolled_count
      FROM groups g
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON g.pool_id = p.id
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id
      WHERE g.id = $1
      GROUP BY g.id, c.id, u.name, p.name
    `;
    
    const detailResult = await pool.query(groupDetailQuery, [id]);
    
    res.json(detailResult.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление группы
router.delete('/groups/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка существования группы
    const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }
    
    // Проверяем, есть ли активные участники в группе
    const enrollmentsResult = await pool.query(
      'SELECT COUNT(*) FROM group_enrollments WHERE group_id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (parseInt(enrollmentsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Невозможно удалить группу с активными участниками. Сначала отчислите всех участников из группы.' 
      });
    }
    
    // Удаление связанных записей в расписании
    await pool.query('DELETE FROM schedules WHERE group_id = $1', [id]);
    
    // Удаление всех записей о зачислениях в эту группу
    await pool.query('DELETE FROM group_enrollments WHERE group_id = $1', [id]);
    
    // Удаление самой группы
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);
    
    res.json({ message: 'Группа успешно удалена' });
  } catch (err) {
    console.error('Ошибка при удалении группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление расписания
router.put('/schedule/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { group_id, date, time, status } = req.body;
    
    // Проверка существования записи в расписании
    const scheduleResult = await pool.query('SELECT * FROM schedules WHERE id = $1', [id]);
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Запись в расписании не найдена' });
    }
    
    // Проверка существования группы
    if (group_id) {
      const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [group_id]);
      if (groupResult.rows.length === 0) {
        return res.status(400).json({ error: 'Указанная группа не существует' });
      }
    }
    
    // Обновление записи в расписании
    const updateQuery = `
      UPDATE schedules 
      SET 
        group_id = COALESCE($1, group_id),
        date = COALESCE($2::date, date),
        time = COALESCE($3::time, time),
        status = COALESCE($4, status)
      WHERE id = $5
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      group_id,
      date,
      time,
      status,
      id
    ]);
    
    // Получаем подробную информацию о записи расписания для ответа
    const scheduleDetailQuery = `
      SELECT s.id, s.date, s.time, s.status, 
             g.id as group_id, g.name as group_name, 
             u.name as coach_name,
             p.name as pool_name
      FROM schedules s
      JOIN groups g ON s.group_id = g.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON g.pool_id = p.id
      WHERE s.id = $1
    `;
    
    const detailResult = await pool.query(scheduleDetailQuery, [id]);
    
    res.json(detailResult.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении расписания:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + err.message });
  }
});

// Удаление записи из расписания
router.delete('/schedule/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка существования записи в расписании
    const scheduleResult = await pool.query('SELECT * FROM schedules WHERE id = $1', [id]);
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Запись в расписании не найдена' });
    }
    
    // Удаление записи из расписания
    await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
    
    res.json({ message: 'Запись в расписании успешно удалена' });
  } catch (err) {
    console.error('Ошибка при удалении записи из расписания:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение списка абонементов (только для админа)
router.get('/subscriptions', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    // Проверяем существование таблицы
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json([]);
    }
    
    const result = await pool.query(`
      SELECT s.*, u.name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении всех абонементов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;