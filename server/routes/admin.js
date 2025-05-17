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
    // Получаем группы с дополнительной информацией
    const result = await pool.query(`
      SELECT g.*, 
             COUNT(ge.id) as enrolled_count 
      FROM groups g
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id
      GROUP BY g.id
      ORDER BY g.name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка групп:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение информации о конкретной группе
router.get('/groups/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }
    
    // Получаем информацию о записанных пользователях
    const enrollmentsResult = await pool.query(`
      SELECT ge.*, u.name, u.email 
      FROM group_enrollments ge
      JOIN users u ON ge.user_id = u.id
      WHERE ge.group_id = $1
    `, [id]);
    
    const group = groupResult.rows[0];
    group.enrollments = enrollmentsResult.rows;
    
    res.json(group);
  } catch (err) {
    console.error('Ошибка при получении информации о группе:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создание новой группы
router.post('/groups', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, capacity, description, coach_id, pool_id, category } = req.body;
    
    // Валидация входных данных
    if (!name || !capacity) {
      return res.status(400).json({ error: 'Название и вместимость обязательны' });
    }
    
    // Проверка валидности тренера, если указан
    if (coach_id) {
      const coachCheck = await pool.query('SELECT * FROM coaches WHERE id = $1', [coach_id]);
      if (coachCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Указанный тренер не существует' });
      }
      
      // Проверяем, что тренер назначен в бассейн и что это совпадает с указанным бассейном
      const coachPoolCheck = await pool.query('SELECT pool_id FROM coaches WHERE id = $1', [coach_id]);
      
      if (!coachPoolCheck.rows[0].pool_id) {
        return res.status(400).json({ error: 'Выбранному тренеру не назначен бассейн' });
      }
      
      // Если указан и бассейн, и тренер, проверяем их соответствие
      if (pool_id && coachPoolCheck.rows[0].pool_id != pool_id) {
        return res.status(400).json({ 
          error: 'Несоответствие бассейна. Тренер работает в другом бассейне.' 
        });
      }
      
      // Используем бассейн тренера, если бассейн не указан
      const poolIdToUse = pool_id || coachPoolCheck.rows[0].pool_id;
      
      // Создаем новую группу с бассейном тренера
      const result = await pool.query(`
        INSERT INTO groups (name, capacity, description, coach_id, pool_id, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, capacity, description, coach_id, poolIdToUse, category]);
      
      res.status(201).json(result.rows[0]);
    } else {
      // Проверка валидности бассейна, если тренер не указан
      if (pool_id) {
        const poolCheck = await pool.query('SELECT id FROM pools WHERE id = $1', [pool_id]);
        if (poolCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Указанный бассейн не существует' });
        }
      }
      
      // Создаем новую группу
      const result = await pool.query(`
        INSERT INTO groups (name, capacity, description, coach_id, pool_id, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, capacity, description, coach_id, pool_id, category]);
      
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Ошибка при создании группы:', err);
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
    
    // Определяем параметры, которые будем использовать для обновления
    let coachIdParam = coach_id || null;
    let poolIdParam = pool_id || null;
    
    // Проверка на существование тренера и связанных ограничений
    if (coach_id) {
      const coachCheck = await pool.query('SELECT * FROM coaches WHERE id = $1', [coach_id]);
      if (coachCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Указанный тренер не существует' });
      }
      
      // Проверяем, что тренер назначен в бассейн
      const coachPoolCheck = await pool.query('SELECT pool_id FROM coaches WHERE id = $1', [coach_id]);
      
      if (!coachPoolCheck.rows[0].pool_id) {
        return res.status(400).json({ error: 'Выбранному тренеру не назначен бассейн' });
      }
      
      // Если указан и бассейн, и тренер, проверяем их соответствие
      if (pool_id && coachPoolCheck.rows[0].pool_id != pool_id) {
        return res.status(400).json({ 
          error: 'Несоответствие бассейна. Тренер работает в другом бассейне.' 
        });
      }
      
      // Используем бассейн тренера для группы
      poolIdParam = coachPoolCheck.rows[0].pool_id;
    }
    
    // Проверка на существование бассейна, если тренер не указан
    if (!coach_id && pool_id) {
      const poolResult = await pool.query('SELECT * FROM pools WHERE id = $1', [pool_id]);
      if (poolResult.rows.length === 0) {
        return res.status(400).json({ error: 'Указанный бассейн не существует' });
      }
    }
    
    // Проверка вместимости - не меньше, чем уже записано
    const enrolledCount = await pool.query(
      'SELECT COUNT(*) FROM group_enrollments WHERE group_id = $1 AND status = $2',
      [id, 'active']
    );
    
    const currentEnrolledCount = parseInt(enrolledCount.rows[0].count, 10);
    if (capacity < currentEnrolledCount) {
      return res.status(400).json({ 
        error: `Вместимость не может быть меньше количества уже записанных участников (${currentEnrolledCount})`
      });
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
    
    // Проверяем существование группы
    const groupCheck = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
    if (groupCheck.rows.length === 0) {
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

// Получение расписания
router.get('/schedule', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const query = `
      SELECT s.*, 
             g.name AS group_name, g.category,
             p.name AS pool_name,
             u.name AS coach_name,
             (SELECT COUNT(*) FROM schedule_enrollments se WHERE se.schedule_id = s.id AND se.status = 'active') AS enrolled_count
      FROM schedule s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY s.day_of_week, s.start_time
    `;
    
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении расписания:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создание нового занятия в расписании
router.post('/schedule', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { group_id, day_of_week, start_time, end_time, pool_id, max_participants, status } = req.body;
    
    // Валидация входных данных
    if (!group_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'Необходимо указать группу, день недели, время начала и окончания' });
    }
    
    if (day_of_week < 1 || day_of_week > 7) {
      return res.status(400).json({ error: 'День недели должен быть от 1 до 7' });
    }
    
    // Проверка существования группы
    const groupCheck = await pool.query('SELECT * FROM groups WHERE id = $1', [group_id]);
    if (groupCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Указанная группа не существует' });
    }
    
    // Определение бассейна на основе группы, если не указан
    let poolIdToUse = pool_id;
    if (!poolIdToUse) {
      const groupPoolCheck = await pool.query('SELECT pool_id FROM groups WHERE id = $1', [group_id]);
      if (groupPoolCheck.rows[0].pool_id) {
        poolIdToUse = groupPoolCheck.rows[0].pool_id;
      }
    }
    
    // Проверка на пересечение с существующими занятиями в этом бассейне
    if (poolIdToUse) {
      const overlapCheck = await pool.query(`
        SELECT * FROM schedule
        WHERE pool_id = $1
        AND day_of_week = $2
        AND status = 'active'
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
      `, [poolIdToUse, day_of_week, start_time, end_time]);
      
      if (overlapCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Время занятия пересекается с другими занятиями в этом бассейне' 
        });
      }
    }
    
    // Создание нового занятия
    const result = await pool.query(`
      INSERT INTO schedule (
        group_id, day_of_week, start_time, end_time, 
        pool_id, max_participants, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      group_id, 
      day_of_week, 
      start_time, 
      end_time, 
      poolIdToUse, 
      max_participants || null, 
      status || 'active'
    ]);
    
    // Получаем дополнительные данные для ответа
    const insertedId = result.rows[0].id;
    const detailQuery = `
      SELECT s.*, 
             g.name AS group_name, g.category,
             p.name AS pool_name,
             u.name AS coach_name
      FROM schedule s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE s.id = $1
    `;
    
    const detailResult = await pool.query(detailQuery, [insertedId]);
    
    res.status(201).json(detailResult.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании занятия:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение детальной информации о занятии
router.get('/schedule/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const scheduleQuery = `
      SELECT s.*, 
             g.name AS group_name, g.category,
             p.name AS pool_name,
             u.name AS coach_name,
             (SELECT COUNT(*) FROM schedule_enrollments se WHERE se.schedule_id = s.id AND se.status = 'active') AS enrolled_count
      FROM schedule s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE s.id = $1
    `;
    
    const scheduleResult = await pool.query(scheduleQuery, [id]);
    
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Занятие не найдено' });
    }
    
    const enrollmentsQuery = `
      SELECT se.*, u.name, u.email 
      FROM schedule_enrollments se
      JOIN users u ON se.user_id = u.id
      WHERE se.schedule_id = $1
      ORDER BY se.enrollment_date
    `;
    
    const enrollmentsResult = await pool.query(enrollmentsQuery, [id]);
    
    const scheduleData = scheduleResult.rows[0];
    scheduleData.enrollments = enrollmentsResult.rows;
    
    res.json(scheduleData);
  } catch (err) {
    console.error('Ошибка при получении данных о занятии:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление занятия в расписании
router.put('/schedule/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      group_id, 
      day_of_week, 
      start_time, 
      end_time, 
      pool_id, 
      max_participants, 
      status 
    } = req.body;

    // Проверка существования занятия
    const scheduleCheck = await pool.query('SELECT * FROM schedule WHERE id = $1', [id]);
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Занятие не найдено' });
    }

    // Проверка валидности группы
    if (group_id) {
      const groupCheck = await pool.query('SELECT * FROM groups WHERE id = $1', [group_id]);
      if (groupCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Указанная группа не существует' });
      }
    }

    // Проверка валидности дня недели
    if (day_of_week && (day_of_week < 1 || day_of_week > 7)) {
      return res.status(400).json({ error: 'День недели должен быть от 1 до 7' });
    }

    // Получаем текущие данные занятия
    const currentSchedule = scheduleCheck.rows[0];
    
    // Определяем бассейн на основе группы, если не указан
    let poolIdToUse = pool_id;
    if (!poolIdToUse && group_id) {
      const groupPoolResult = await pool.query('SELECT pool_id FROM groups WHERE id = $1', [group_id]);
      if (groupPoolResult.rows.length > 0 && groupPoolResult.rows[0].pool_id) {
        poolIdToUse = groupPoolResult.rows[0].pool_id;
      }
    } else if (!poolIdToUse) {
      // Оставляем текущее значение
      poolIdToUse = currentSchedule.pool_id;
    }

    // Проверка на пересечение с другими занятиями
    const updatedDayOfWeek = day_of_week || currentSchedule.day_of_week;
    const updatedStartTime = start_time || currentSchedule.start_time;
    const updatedEndTime = end_time || currentSchedule.end_time;

    if (poolIdToUse) {
      const overlapCheck = await pool.query(`
        SELECT * FROM schedule
        WHERE id != $1
        AND pool_id = $2
        AND day_of_week = $3
        AND status = 'active'
        AND (
          (start_time <= $4 AND end_time > $4) OR
          (start_time < $5 AND end_time >= $5) OR
          (start_time >= $4 AND end_time <= $5)
        )
      `, [id, poolIdToUse, updatedDayOfWeek, updatedStartTime, updatedEndTime]);
      
      if (overlapCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Время занятия пересекается с другими занятиями в этом бассейне' 
        });
      }
    }

    // Обновление занятия
    const updateQuery = `
      UPDATE schedule
      SET 
        group_id = COALESCE($1, group_id),
        day_of_week = COALESCE($2, day_of_week),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        pool_id = $5,
        max_participants = COALESCE($6, max_participants),
        status = COALESCE($7, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      group_id, 
      day_of_week, 
      start_time, 
      end_time, 
      poolIdToUse, 
      max_participants, 
      status, 
      id
    ]);

    // Получаем дополнительные данные для ответа
    const detailQuery = `
      SELECT s.*, 
             g.name AS group_name, g.category,
             p.name AS pool_name,
             u.name AS coach_name
      FROM schedule s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN pools p ON s.pool_id = p.id
      LEFT JOIN coaches c ON g.coach_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE s.id = $1
    `;
    
    const detailResult = await pool.query(detailQuery, [id]);
    
    res.json(detailResult.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении занятия:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление занятия из расписания
router.delete('/schedule/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка существования занятия
    const scheduleCheck = await pool.query('SELECT * FROM schedule WHERE id = $1', [id]);
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Занятие не найдено' });
    }
    
    // Проверка наличия активных записей на занятие
    const enrollmentsCheck = await pool.query(
      'SELECT COUNT(*) FROM schedule_enrollments WHERE schedule_id = $1 AND status = $2',
      [id, 'active']
    );
    
    const enrollmentsCount = parseInt(enrollmentsCheck.rows[0].count, 10);
    
    if (enrollmentsCount > 0) {
      // Отменяем все записи на занятие
      await pool.query(
        'UPDATE schedule_enrollments SET status = $1 WHERE schedule_id = $2 AND status = $3',
        ['cancelled', id, 'active']
      );
      
      // Добавляем уведомления пользователям
      const enrolledUsers = await pool.query(
        'SELECT user_id FROM schedule_enrollments WHERE schedule_id = $1',
        [id]
      );
      
      const scheduleInfo = await pool.query(`
        SELECT g.name AS group_name, s.day_of_week, s.start_time
        FROM schedule s
        JOIN groups g ON s.group_id = g.id
        WHERE s.id = $1
      `, [id]);
      
      if (scheduleInfo.rows.length > 0) {
        const { group_name, day_of_week, start_time } = scheduleInfo.rows[0];
        const dayNames = ['', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];
        const message = `Занятие группы "${group_name}" в ${dayNames[day_of_week]} в ${start_time.substring(0, 5)} было отменено администратором.`;
        
        for (const user of enrolledUsers.rows) {
          await pool.query(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES ($1, $2, $3, $4)
          `, [
            user.user_id,
            'Отмена занятия',
            message,
            'schedule_cancelled'
          ]);
        }
      }
    }
    
    // Удаляем занятие
    await pool.query('DELETE FROM schedule WHERE id = $1', [id]);
    
    res.json({ message: 'Занятие успешно удалено из расписания' });
  } catch (err) {
    console.error('Ошибка при удалении занятия:', err);
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

// Получение конкретного пользователя по ID
router.get('/users/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при получении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление пользователя
router.put('/users/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    
    // Проверка существования пользователя
    const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Если задан email, проверяем его уникальность
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email уже используется другим пользователем' });
      }
    }
    
    // Формируем запрос на обновление
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    
    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    
    if (role && ['admin', 'client', 'coach'].includes(role)) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Не указаны поля для обновления' });
    }
    
    // Добавляем ID в конец массива параметров
    values.push(id);
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role, created_at`,
      values
    );
    
    res.json({
      message: 'Пользователь успешно обновлен',
      user: result.rows[0]
    });
    
  } catch (err) {
    console.error('Ошибка при обновлении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление пользователя
router.delete('/users/:id', verifyToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Проверка попытки удалить самого себя
    if (Number(id) === adminId) {
      return res.status(400).json({ error: 'Нельзя удалить собственную учетную запись' });
    }
    
    // Проверка существования пользователя
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Проверка всех зависимостей перед удалением
    // 1. Проверка подписок
    const subscriptionsCheck = await pool.query(
      'SELECT id FROM subscriptions WHERE user_id = $1',
      [id]
    );
    
    // 2. Проверка записей в группы
    const enrollmentsCheck = await pool.query(
      'SELECT id FROM group_enrollments WHERE user_id = $1',
      [id]
    );
    
    // 3. Если пользователь тренер, проверка связанных групп
    if (userCheck.rows[0].role === 'coach') {
      const coachCheck = await pool.query('SELECT id FROM coaches WHERE user_id = $1', [id]);
      
      if (coachCheck.rows.length > 0) {
        const coachId = coachCheck.rows[0].id;
        
        const groupsCheck = await pool.query(
          'SELECT id FROM groups WHERE coach_id = $1',
          [coachId]
        );
        
        if (groupsCheck.rows.length > 0) {
          return res.status(400).json({ 
            error: 'Невозможно удалить тренера с назначенными группами. Сначала переназначьте группы.'
          });
        }
        
        // Удаление тренера
        await pool.query('DELETE FROM coaches WHERE user_id = $1', [id]);
      }
    }
    
    // Удаление связанных записей
    if (subscriptionsCheck.rows.length > 0) {
      await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [id]);
    }
    
    if (enrollmentsCheck.rows.length > 0) {
      await pool.query('DELETE FROM group_enrollments WHERE user_id = $1', [id]);
    }
    
    // Удаляем уведомления пользователя
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    
    // Удаляем самого пользователя
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'Пользователь успешно удален' });
    
  } catch (err) {
    console.error('Ошибка при удалении пользователя:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;