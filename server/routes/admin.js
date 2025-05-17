const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Промежуточное ПО для ограничения доступа только для админов
router.use(auth, roleMiddleware(['admin']));

// Получение списка всех пользователей
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка пользователей:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение информации о конкретном пользователе
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Основная информация о пользователе
    const userResult = await pool.query(`
      SELECT id, name, email, role, created_at 
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    // Проверяем, является ли пользователь тренером
    if (user.role === 'coach') {
      // Получаем данные тренера
      const coachResult = await pool.query(`
        SELECT c.*, p.name AS pool_name 
        FROM coaches c
        LEFT JOIN pools p ON c.pool_id = p.id
        WHERE c.user_id = $1
      `, [userId]);
      
      if (coachResult.rows.length > 0) {
        user.coach_data = coachResult.rows[0];
      }
    }
    
    // Получаем абонементы пользователя
    const subscriptionsResult = await pool.query(`
      SELECT id, type, price, description, start_date, end_date, active
      FROM subscriptions
      WHERE user_id = $1
      ORDER BY start_date DESC
    `, [userId]);
    
    user.subscriptions = subscriptionsResult.rows;
    
    // Получаем записи в группы
    const enrollmentsResult = await pool.query(`
      SELECT ge.id, g.id AS group_id, g.name AS group_name, 
             ge.enrollment_date, ge.status
      FROM group_enrollments ge
      JOIN groups g ON ge.group_id = g.id
      WHERE ge.user_id = $1
      ORDER BY ge.enrollment_date DESC
    `, [userId]);
    
    user.enrollments = enrollmentsResult.rows;
    
    res.json(user);
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление данных пользователя
router.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role } = req.body;
    
    // Проверяем существование пользователя
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE id = $1', 
      [userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Обновляем данные пользователя
    await pool.query(
      'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4',
      [name, email, role, userId]
    );
    
    // Если роль изменена на тренера, создаем запись тренера
    if (role === 'coach') {
      // Проверяем, существует ли уже запись тренера
      const coachCheck = await pool.query(
        'SELECT * FROM coaches WHERE user_id = $1',
        [userId]
      );
      
      if (coachCheck.rows.length === 0) {
        // Создаем запись тренера
        await pool.query(
          'INSERT INTO coaches (user_id) VALUES ($1)',
          [userId]
        );
      }
    }
    
    res.json({ message: 'Данные пользователя обновлены' });
  } catch (err) {
    console.error('Ошибка при обновлении данных пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление пользователя
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Проверяем, не пытается ли админ удалить сам себя
    if (userId === req.user.id.toString()) {
      return res.status(403).json({ 
        error: 'Вы не можете удалить свою собственную учетную запись' 
      });
    }
    
    // Проверяем существование пользователя
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Удаляем связанные данные
    await pool.query('DELETE FROM group_enrollments WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    
    // Если пользователь - тренер, удаляем запись тренера
    if (userCheck.rows[0].role === 'coach') {
      await pool.query('DELETE FROM coaches WHERE user_id = $1', [userId]);
    }
    
    // Удаляем пользователя
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({ message: 'Пользователь успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение статистики
router.get('/stats', async (req, res) => {
  try {
    // Общее количество пользователей по ролям
    const usersStats = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    
    // Количество активных абонементов
    const activeSubscriptions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM subscriptions 
      WHERE active = true AND end_date > CURRENT_TIMESTAMP
    `);
    
    // Количество групп
    const groupsCount = await pool.query(`
      SELECT COUNT(*) as count FROM groups
    `);
    
    // Количество бассейнов
    const poolsCount = await pool.query(`
      SELECT COUNT(*) as count FROM pools
    `);
    
    res.json({
      users: usersStats.rows,
      activeSubscriptions: activeSubscriptions.rows[0].count,
      groups: groupsCount.rows[0].count,
      pools: poolsCount.rows[0].count
    });
  } catch (err) {
    console.error('Ошибка при получении статистики:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение списка всех абонементов
router.get('/subscriptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.type, s.price, s.description, s.visits_per_week,
             s.start_date, s.end_date, s.active,
             u.id as user_id, u.name as user_name, u.email as user_email
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.start_date DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка абонементов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение информации о конкретном абонементе
router.get('/subscriptions/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    
    const result = await pool.query(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [subscriptionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Абонемент не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при получении данных абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создание нового абонемента
router.post('/subscriptions', async (req, res) => {
  try {
    const { user_id, type, price, description, visits_per_week, start_date, end_date, active } = req.body;
    
    // Проверка существования пользователя
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    // Валидация данных
    if (!type || !price) {
      return res.status(400).json({ error: 'Не указаны обязательные поля' });
    }
    
    // Проверка посещений в неделю
    if (visits_per_week && ![1, 2, 3, 5].includes(parseInt(visits_per_week))) {
      return res.status(400).json({ error: 'Недопустимое значение для посещений в неделю' });
    }
    
    // Создание абонемента
    const result = await pool.query(`
      INSERT INTO subscriptions 
      (user_id, type, price, description, visits_per_week, start_date, end_date, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      user_id, 
      type, 
      price, 
      description || null, 
      visits_per_week || null,
      start_date || 'now()',
      end_date || null,
      active !== undefined ? active : true
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление абонемента
router.put('/subscriptions/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    const { user_id, type, price, description, visits_per_week, start_date, end_date, active } = req.body;
    
    // Проверка существования абонемента
    const subscriptionCheck = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [subscriptionId]);
    if (subscriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Абонемент не найден' });
    }
    
    // Если передан user_id, проверяем существование пользователя
    if (user_id) {
      const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Пользователь не найден' });
      }
    }
    
    // Проверка посещений в неделю
    if (visits_per_week && ![1, 2, 3, 5].includes(parseInt(visits_per_week))) {
      return res.status(400).json({ error: 'Недопустимое значение для посещений в неделю' });
    }
    
    // Получаем существующие данные для обновления только измененных полей
    const currentData = subscriptionCheck.rows[0];
    
    // Обновляем абонемент
    const result = await pool.query(`
      UPDATE subscriptions
      SET 
        user_id = $1,
        type = $2,
        price = $3, 
        description = $4,
        visits_per_week = $5,
        start_date = $6,
        end_date = $7,
        active = $8
      WHERE id = $9
      RETURNING *
    `, [
      user_id !== undefined ? user_id : currentData.user_id,
      type || currentData.type,
      price !== undefined ? price : currentData.price,
      description !== undefined ? description : currentData.description,
      visits_per_week !== undefined ? visits_per_week : currentData.visits_per_week,
      start_date || currentData.start_date,
      end_date !== undefined ? end_date : currentData.end_date,
      active !== undefined ? active : currentData.active,
      subscriptionId
    ]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление абонемента
router.delete('/subscriptions/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    
    // Проверка существования абонемента
    const subscriptionCheck = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [subscriptionId]);
    if (subscriptionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Абонемент не найден' });
    }
    
    // Удаляем абонемент
    await pool.query('DELETE FROM subscriptions WHERE id = $1', [subscriptionId]);
    
    res.json({ message: 'Абонемент успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;