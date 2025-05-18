const express = require('express');
const router = express.Router();
const pool = require('../db'); // Изменить импорт с { pool } на pool
const db = pool; // Добавить эту строку для совместимости с существующими вызовами db.query
const { verifyToken } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/role');

// Создаем псевдоним для совместимости с существующим кодом
const authMiddleware = verifyToken;

// Создаем таблицу coaches при инициализации
async function createCoachesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coaches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        specialty VARCHAR(255),
        experience INTEGER DEFAULT 0,
        rating NUMERIC(3,2) DEFAULT 0,
        description TEXT
      );
    `);
    console.log('Таблица coaches проверена/создана');
  } catch (err) {
    console.error('Ошибка при создании таблицы coaches:', err);
  }
}

// Автоматическое создание профиля тренера при загрузке профиля
async function ensureCoachProfileExists(userId) {
  try {
    // Проверяем существование профиля
    const check = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [userId]);
    
    // Если профиля нет, создаем его
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO coaches (user_id, specialty, experience, description, rating)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'Общая подготовка', 0, 'Информация отсутствует', 0]
      );
      console.log(`Автоматически создан профиль тренера для пользователя ${userId}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Ошибка при проверке/создании профиля тренера:', err);
    return false;
  }
}

// Функция для проверки/создания записи тренера
async function ensureCoachExists(userId) {
  try {
    // Проверяем наличие записи в таблице coaches
    const coachCheck = await pool.query(
      'SELECT id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    // Если запись не существует, создаем её
    if (coachCheck.rows.length === 0) {
      const result = await pool.query(
        `INSERT INTO coaches (user_id, specialty, experience, description, rating)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, 'Общая подготовка', 0, 'Информация отсутствует', 0]
      );
      console.log(`Создана запись тренера для пользователя ${userId}, id=${result.rows[0].id}`);
      return result.rows[0].id;
    }
    
    return coachCheck.rows[0].id;
  } catch (err) {
    console.error('Ошибка при проверке/создании записи тренера:', err);
    throw err;
  }
}

// Запускаем создание таблицы
createCoachesTable();

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

// ВАЖНО: Сначала идут все статические маршруты

// Получение данных профиля тренера
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Создаем запись тренера, если её нет
    await ensureCoachExists(userId);

    console.log('Coach profile request, userId:', userId);
    
    // Получаем данные пользователя
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Данные о тренере
    let coachInfo = null;
    try {
      const coachResult = await pool.query(
        'SELECT specialty, experience, rating, description FROM coaches WHERE user_id = $1',
        [userId]
      );
      
      if (coachResult.rows.length > 0) {
        coachInfo = coachResult.rows[0];
      }
    } catch (coachError) {
      console.error('Ошибка при получении данных тренера:', coachError);
    }
    
    // Получаем группы
    let groups = [];
    try {
      // Сначала получаем ID тренера
      const coachResult = await pool.query(
        'SELECT id FROM coaches WHERE user_id = $1',
        [userId]
      );
      
      if (coachResult.rows.length > 0) {
        const coachId = coachResult.rows[0].id;
        
        // Используем coachId для получения групп
        const groupsResult = await pool.query(
          `SELECT id, name, capacity, description 
           FROM groups 
           WHERE coach_id = $1`,
          [coachId]
        );
        groups = groupsResult.rows.map(g => ({...g, enrolled_count: 0}));
      }
    } catch (groupsError) {
      console.error('Ошибка при получении групп тренера:', groupsError);
    }
    
    // Отправляем все собранные данные
    res.json({
      user: userResult.rows[0],
      coach_info: coachInfo,
      groups: groups
    });
    
  } catch (err) {
    console.error('Общая ошибка при получении профиля тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление информации о тренере
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { specialty, experience, description } = req.body;
    
    // Проверяем наличие записи о тренере
    const checkResult = await pool.query(
      'SELECT * FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (checkResult.rows.length === 0) {
      // Создаем запись, если её нет
      await pool.query(
        `INSERT INTO coaches (user_id, specialty, experience, description, rating)
         VALUES ($1, $2, $3, $4, 0)`,
        [userId, specialty || '', experience || 0, description || '']
      );
    } else {
      // Обновляем существующую запись
      await pool.query(
        `UPDATE coaches 
         SET specialty = $2, experience = $3, description = $4
         WHERE user_id = $1`,
        [userId, specialty || '', experience || 0, description || '']
      );
    }
    
    res.json({ message: 'Профиль тренера обновлен' });
    
  } catch (err) {
    console.error('Ошибка при обновлении профиля тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение групп тренера
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Получаем ID тренера
    const coachResult = await pool.query(
      'SELECT id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Получаем группы по ID тренера
    const groupsResult = await pool.query(
      `SELECT id, name, capacity, description
       FROM groups
       WHERE coach_id = $1`,
      [coachId]
    );
    
    res.json(groupsResult.rows);
    
  } catch (err) {
    console.error('Ошибка при получении групп тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавление новой группы тренером
router.post('/groups', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Добавляем поле category в запрос
    const { name, capacity, description, category } = req.body;
    
    // Проверка на допустимые значения категории
    if (category && !['beginners', 'teenagers', 'adults', 'athletes'].includes(category)) {
      return res.status(400).json({ error: 'Неверная категория группы' });
    }
    
    // Получаем ID тренера и его бассейн
    const coachResult = await pool.query(
      'SELECT id, pool_id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachResult.rows[0].id;
    const poolId = coachResult.rows[0].pool_id;
    
    // Проверяем, назначен ли тренер в бассейн
    if (!poolId) {
      return res.status(400).json({ error: 'Вы не назначены в бассейн. Обратитесь к администратору для назначения.' });
    }
    
    // Создаем группу с автоматическим указанием бассейна тренера и категории
    const groupResult = await pool.query(
      `INSERT INTO groups (name, capacity, description, coach_id, pool_id, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, capacity, description, pool_id, category`,
      [name, capacity, description, coachId, poolId, category || 'beginners'] // По умолчанию - начинающие
    );
    
    console.log(`Группа создана для тренера ${coachId} в бассейне ${poolId}, категория: ${category || 'beginners'}`);
    
    // Получаем название бассейна для отображения в ответе
    const poolResult = await pool.query(
      'SELECT name FROM pools WHERE id = $1',
      [poolId]
    );
    
    const poolName = poolResult.rows.length > 0 ? poolResult.rows[0].name : 'Неизвестный бассейн';
    
    res.status(201).json({
      message: `Группа успешно создана в бассейне "${poolName}"`,
      group: {
        ...groupResult.rows[0],
        pool_name: poolName
      }
    });
    
  } catch (err) {
    console.error('Ошибка при создании группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Маршруты для конкретных групп
router.put('/groups/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { name, capacity, description } = req.body;
    
    // Получаем ID тренера из таблицы coaches
    const coachResult = await pool.query(
      'SELECT id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Проверяем, что группа принадлежит тренеру, используя coachId
    const checkResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1 AND coach_id = $2',
      [groupId, coachId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена или вы не являетесь ее тренером' });
    }
    
    // Обновляем группу
    await pool.query(
      `UPDATE groups SET name = $1, capacity = $2, description = $3
       WHERE id = $4 AND coach_id = $5`,
      [name, capacity, description, groupId, coachId]
    );
    
    res.json({ message: 'Информация о группе обновлена' });
    
  } catch (err) {
    console.error('Ошибка при обновлении группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/groups/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    
    // Получаем ID тренера из таблицы coaches
    const coachResult = await pool.query(
      'SELECT id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Проверяем, что группа принадлежит тренеру
    const checkResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1 AND coach_id = $2',
      [groupId, coachId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена или вы не являетесь ее тренером' });
    }
    
    // Удаляем записи на занятия в этой группе
    await pool.query('DELETE FROM enrollments WHERE group_id = $1', [groupId]);
    
    // Удаляем расписание группы
    await pool.query('DELETE FROM schedules WHERE group_id = $1', [groupId]);
    
    // Удаляем группу
    await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
    
    res.json({ message: 'Группа успешно удалена' });
    
  } catch (err) {
    console.error('Ошибка при удалении группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение участников группы
router.get('/groups/:id/members', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    
    // Получаем ID тренера из таблицы coaches
    const coachResult = await pool.query(
      'SELECT id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Проверяем, что группа принадлежит данному тренеру
    const checkResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1 AND coach_id = $2',
      [groupId, coachId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена или вы не являетесь ее тренером' });
    }
    
    // Получаем список участников
    const membersResult = await pool.query(
      `SELECT e.id as enrollment_id, u.id, u.name, u.email, e.status,
       to_char(e.enrollment_date, 'DD.MM.YYYY') as enrollment_date
       FROM users u
       JOIN group_enrollments e ON u.id = e.user_id
       WHERE e.group_id = $1 AND e.status = 'active'
       ORDER BY u.name`,
      [groupId]
    );
    
    res.json(membersResult.rows);
    
  } catch (err) {
    console.error('Ошибка при получении участников группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление участника из группы
router.delete('/groups/:groupId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId, memberId } = req.params;
    
    // Получаем ID тренера
    const coachResult = await pool.query(
      'SELECT id FROM coaches WHERE user_id = $1',
      [userId]
    );
    
    if (coachResult.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль тренера не найден' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Проверяем, что группа принадлежит тренеру
    const checkResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1 AND coach_id = $2',
      [groupId, coachId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена или вы не являетесь ее тренером' });
    }
    
    // Изменение: устанавливаем статус "removed_by_coach" вместо "cancelled"
    await pool.query(
      `UPDATE group_enrollments 
       SET status = 'removed_by_coach' 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, memberId]
    );
    
    // Добавляем уведомление пользователю
    const groupNameResult = await pool.query('SELECT name FROM groups WHERE id = $1', [groupId]);
    const groupName = groupNameResult.rows.length > 0 ? groupNameResult.rows[0].name : 'группы';
    
    await pool.query(
      `INSERT INTO notifications 
       (user_id, title, message, type) 
       VALUES ($1, $2, $3, $4)`,
      [
        memberId, 
        'Вы исключены из группы', 
        `Тренер исключил вас из группы "${groupName}"`,
        'group_removed'
      ]
    );
    
    res.json({ message: 'Участник успешно удален из группы' });
    
  } catch (err) {
    console.error('Ошибка при удалении участника из группы:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/groups/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { date, time } = req.body;
    
    // Проверяем, что группа принадлежит тренеру
    const checkResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1 AND coach_id = $2',
      [groupId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена или вы не являетесь ее тренером' });
    }
    
    // Добавляем занятие в расписание
    const result = await pool.query(
      `INSERT INTO schedules (group_id, date, time)
       VALUES ($1, $2, $3)
       RETURNING id, date, time`,
      [groupId, date, time]
    );
    
    res.status(201).json({
      message: 'Занятие добавлено в расписание',
      schedule: result.rows[0]
    });
    
  } catch (err) {
    console.error('Ошибка при добавлении занятия в расписание:', err);
    
    // Если запись уже существует
    if (err.code === '23505') { // Код UNIQUE_VIOLATION в PostgreSQL
      return res.status(400).json({ error: 'Занятие на это время уже существует' });
    }
    
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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

// Обновление тренера
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { specialty, experience, description, pool_id } = req.body;

    // Проверка существования тренера
    const coachCheck = await pool.query('SELECT * FROM coaches WHERE id = $1', [id]);
    if (coachCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Тренер не найден' });
    }

    // Проверка на null для числовых полей
    const experienceValue = experience === '' ? null : experience;
    
    // Обновляем данные тренера
    const result = await pool.query(
      'UPDATE coaches SET specialty = $1, experience = $2, description = $3, pool_id = $4 WHERE id = $5 RETURNING *',
      [specialty, experienceValue, description, pool_id, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении тренера:', err);
    res.status(500).json({ message: 'Ошибка сервера', error: err.message });
  }
});

// ВАЖНО: динамические маршруты ставим в КОНЕЦ файла!
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
    const groupsResult = await pool.query(
      `SELECT g.id, g.name, g.capacity, g.description,
       (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id) as enrolled_count
       FROM groups g
       WHERE g.coach_id = $1`,
      [id]
    );
    
    const coach = result.rows[0];
    coach.groups = groupsResult.rows;
    
    res.json(coach);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении информации о тренере' });
  }
});

// Получение групп тренера (по запросу)
router.get('/my-groups', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Сначала получаем id тренера по id пользователя
    const coachResult = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [userId]);
    
    if (coachResult.rows.length === 0) {
      return res.status(403).json({ error: 'У вас нет прав тренера' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Получаем все группы этого тренера
    const groupsResult = await pool.query(`
      SELECT g.id, g.name, g.description, g.capacity, g.category,
             p.name as pool_name, p.address as pool_address,
             (SELECT COUNT(*) FROM group_enrollments 
              WHERE group_id = g.id AND status = 'active') as enrolled_count
      FROM groups g
      LEFT JOIN pools p ON g.pool_id = p.id
      WHERE g.coach_id = $1
      ORDER BY g.name
    `, [coachId]);
    
    res.json(groupsResult.rows);
  } catch (err) {
    console.error('Ошибка при получении групп тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение расписания тренера (по запросу)
router.get('/my-schedule', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Сначала получаем id тренера по id пользователя
    const coachResult = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [userId]);
    
    if (coachResult.rows.length === 0) {
      return res.status(403).json({ error: 'У вас нет прав тренера' });
    }
    
    const coachId = coachResult.rows[0].id;
    
    // Получаем расписание всех групп этого тренера
    const scheduleResult = await pool.query(`
      SELECT s.id, s.date, s.time, g.name as group_name, g.capacity,
             (SELECT COUNT(*) FROM group_enrollments e WHERE e.group_id = g.id AND e.status = 'active') as enrolled_count
      FROM schedules s
      JOIN groups g ON s.group_id = g.id
      WHERE g.coach_id = $1
      ORDER BY s.date, s.time
    `, [coachId]);
    
    res.json(scheduleResult.rows);
  } catch (err) {
    console.error('Ошибка при получении расписания тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение профиля тренера (по запросу)
router.get('/my-profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Получаем данные пользователя
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Данные о тренере
    let coachInfo = null;
    try {
      const coachResult = await pool.query(
        'SELECT specialty, experience, rating, description FROM coaches WHERE user_id = $1',
        [userId]
      );
      
      if (coachResult.rows.length > 0) {
        coachInfo = coachResult.rows[0];
      }
    } catch (coachError) {
      console.error('Ошибка при получении данных тренера:', coachError);
    }
    
    // Получаем группы
    let groups = [];
    try {
      // Сначала получаем ID тренера
      const coachResult = await pool.query(
        'SELECT id FROM coaches WHERE user_id = $1',
        [userId]
      );
      
      if (coachResult.rows.length > 0) {
        const coachId = coachResult.rows[0].id;
        
        // Используем coachId для получения групп
        const groupsResult = await pool.query(
          `SELECT id, name, capacity, description 
           FROM groups 
           WHERE coach_id = $1`,
          [coachId]
        );
        groups = groupsResult.rows.map(g => ({...g, enrolled_count: 0}));
      }
    } catch (groupsError) {
      console.error('Ошибка при получении групп тренера:', groupsError);
    }
    
    // Отправляем все собранные данные
    res.json({
      user: userResult.rows[0],
      coach_info: coachInfo,
      groups: groups
    });
    
  } catch (err) {
    console.error('Общая ошибка при получении профиля тренера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;