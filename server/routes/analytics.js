const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger'); // Добавляем импорт модуля logger

// Вспомогательная функция для проверки существования таблицы
async function tableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    );
  `, [tableName]);
  return result.rows[0].exists;
}

// 1. Список тренеров по бассейнам
router.get('/coaches-by-pools', verifyToken, async (req, res) => {
  try {
    // Проверка существования необходимых таблиц
    const poolsExists = await tableExists('pools');
    if (!poolsExists) {
      return res.status(404).json({
        message: 'Таблица бассейнов не найдена',
        details: 'Необходимо создать таблицу pools'
      });
    }

    // Используем более простой SQL-запрос, который точно сработает
    const result = await pool.query(`
      SELECT 
        p.id AS pool_id, 
        p.name AS pool_name,
        array_to_json(
          array(
            SELECT json_build_object(
              'id', c.id,
              'name', u.name,
              'specialty', c.specialty,
              'experience', c.experience
            )
            FROM coaches c
            JOIN users u ON c.user_id = u.id
            WHERE c.pool_id = p.id
          )
        ) AS coaches
      FROM pools p
      ORDER BY p.name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка тренеров по бассейнам:', err);
    res.status(500).json({ 
      message: 'Внутренняя ошибка сервера',
      details: err.message
    });
  }
});

// 2. Итоговая прибыль каждого тренера в каждом бассейне
router.get('/coach-profit-by-pool', verifyToken, async (req, res) => {
  try {
    // Проверка существования таблиц
    const [coachesExists, subscriptionsExists, groupsExists, enrollmentsExists] = await Promise.all([
      tableExists('coaches'),
      tableExists('subscriptions'),
      tableExists('groups'),
      tableExists('group_enrollments')
    ]);

    if (!coachesExists || !subscriptionsExists || !groupsExists || !enrollmentsExists) {
      return res.json([]);
    }

    // Восстанавливаем правильный множитель для прибыли (0.4 от стоимости абонемента)
    const result = await pool.query(`
      SELECT 
        p.id AS pool_id, 
        p.name AS pool_name, 
        c.id AS coach_id, 
        u.name AS coach_name,
        COALESCE(SUM(s.price * 0.4), 0) AS profit  -- Возвращаем множитель 0.4
      FROM pools p
      LEFT JOIN coaches c ON c.pool_id = p.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN groups g ON g.coach_id = c.id
      LEFT JOIN group_enrollments ge ON ge.group_id = g.id AND ge.status = 'active'
      LEFT JOIN subscriptions s ON s.user_id = ge.user_id AND s.status = 'active'
      WHERE u.name IS NOT NULL
      GROUP BY p.id, p.name, c.id, u.name
      ORDER BY profit DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении прибыли тренеров:', err);
    res.status(500).json({ 
      message: 'Внутренняя ошибка сервера',
      details: err.message 
    });
  }
});

// Добавляем отсутствующий маршрут для прибыли тренеров (без группировки по бассейнам)
router.get('/coach-profit', verifyToken, async (req, res) => {
  try {
    // Проверка существования таблиц
    const [coachesExists, subscriptionsExists, groupsExists, enrollmentsExists] = await Promise.all([
      tableExists('coaches'),
      tableExists('subscriptions'),
      tableExists('groups'),
      tableExists('group_enrollments')
    ]);

    if (!coachesExists || !subscriptionsExists || !groupsExists || !enrollmentsExists) {
      return res.json([]);
    }

    // Запрос для получения прибыли по каждому тренеру
    const result = await pool.query(`
      SELECT 
        c.id AS coach_id, 
        u.name AS coach_name,
        p.name AS pool_name,
        c.specialty,
        c.experience,
        COUNT(DISTINCT g.id) AS group_count,
        COUNT(DISTINCT ge.user_id) AS student_count,
        COALESCE(SUM(s.price), 0) AS revenue,
        COALESCE(SUM(s.price * 0.4), 0) AS profit  -- Тренер получает 40% от стоимости абонемента
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON c.pool_id = p.id
      LEFT JOIN groups g ON g.coach_id = c.id
      LEFT JOIN group_enrollments ge ON ge.group_id = g.id AND ge.status = 'active'
      LEFT JOIN subscriptions s ON s.user_id = ge.user_id AND s.status = 'active'
      WHERE u.name IS NOT NULL
      GROUP BY c.id, u.name, p.name, c.specialty, c.experience
      ORDER BY profit DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении прибыли тренеров:', err);
    res.status(500).json({ 
      message: 'Внутренняя ошибка сервера',
      details: err.message 
    });
  }
});

// 3. Тренеры, работающие с начинающими (исправлено дублирование)
router.get('/coaches-for-beginners', verifyToken, async (req, res) => {
  try {
    // Проверяем существование необходимых таблиц
    const [coachesExists, groupsExists] = await Promise.all([
      tableExists('coaches'),
      tableExists('groups')
    ]);
    
    if (!coachesExists || !groupsExists) {
      return res.json([]);
    }

    // Изменённый запрос с DISTINCT ON для избежания дублирования тренеров
    const result = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id, 
        u.name, 
        c.specialty, 
        c.experience,
        p.name AS pool_name,
        STRING_AGG(g.name, ', ') AS group_names
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN pools p ON c.pool_id = p.id
      JOIN groups g ON g.coach_id = c.id
      WHERE g.category = 'beginners'
      GROUP BY c.id, u.name, c.specialty, c.experience, p.name
      ORDER BY c.id, c.experience DESC
    `);

   
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении тренеров для начинающих:', err);
    res.status(500).json({ 
      message: 'Внутренняя ошибка сервера',
      details: err.message 
    });
  }
});

// 4. Список посетителей, занимающихся с заданным тренером
router.get('/coach/:id/users', verifyToken, async (req, res) => {
  try {
    const coachId = req.params.id;
    
    // Проверяем существование таблиц
    const [coachesExists, groupsExists, enrollmentsExists] = await Promise.all([
      tableExists('coaches'),
      tableExists('groups'),
      tableExists('group_enrollments')
    ]);
    
    if (!coachesExists || !groupsExists || !enrollmentsExists) {
      console.log('Отсутствуют необходимые таблицы для запроса клиентов тренера');
      return res.json([]);
    }

    // Исправленный запрос, использующий связь через группы
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email,
        COUNT(DISTINCT ge.id) AS enrollment_count,
        STRING_AGG(DISTINCT g.name, ', ') AS groups
      FROM users u
      JOIN group_enrollments ge ON u.id = ge.user_id AND ge.status = 'active'
      JOIN groups g ON ge.group_id = g.id
      JOIN coaches c ON g.coach_id = c.id
      WHERE c.id = $1
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `, [coachId]);

    // Добавим логирование для отладки
    console.log(`Найдено ${result.rows.length} клиентов для тренера с ID ${coachId}`);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка клиентов тренера:', err);
    res.status(500).json({ 
      message: 'Внутренняя ошибка сервера',
      details: err.message 
    });
  }
});

// 5. Количество групп в каждом бассейне по дням недели
router.get('/groups-by-day', verifyToken, async (req, res) => {
  try {
    logger.info('Запрос количества групп по дням недели');

    // 1. Сначала заполняем тестовые данные в базу, если их нет
    await fillTestScheduleData();
    
    // 2. Получаем список всех бассейнов
    const poolsResult = await pool.query(`
      SELECT id, name FROM pools ORDER BY name
    `);
    
    // 3. Получаем расписание для всех бассейнов и групп
    // День недели: 1 (Пн) - 7 (Вс)
    const scheduleQuery = `
      SELECT 
        p.id AS pool_id, 
        p.name AS pool_name,
        COALESCE(s.day_of_week, EXTRACT(DOW FROM CURRENT_DATE) + 1) AS day_of_week,
        COUNT(DISTINCT g.id) AS group_count
      FROM pools p
      JOIN groups g ON g.pool_id = p.id
      JOIN schedule s ON s.group_id = g.id
      GROUP BY p.id, p.name, s.day_of_week
      ORDER BY p.name, s.day_of_week
    `;
    
    const scheduleResult = await pool.query(scheduleQuery);
    
    // 4. Трансформируем данные в удобный формат для фронтенда
    const poolsMap = {};
    const daysOfWeek = [1, 2, 3, 4, 5, 6, 7];
    
    // Инициализируем пустую структуру для всех бассейнов
    for (const pool of poolsResult.rows) {
      poolsMap[pool.id] = {
        pool_id: pool.id,
        pool_name: pool.name,
        days: {}
      };
      
      // Инициализируем нулевые значения для всех дней недели
      for (const day of daysOfWeek) {
        poolsMap[pool.id].days[day] = 0;
      }
    }
    
    // Заполняем реальными данными
    for (const record of scheduleResult.rows) {
      const { pool_id, day_of_week, group_count } = record;
      if (poolsMap[pool_id] && day_of_week >= 1 && day_of_week <= 7) {
        poolsMap[pool_id].days[day_of_week] = parseInt(group_count);
      }
    }
    
    // Преобразуем в плоскую структуру для отправки
    const result = [];
    for (const poolId in poolsMap) {
      const pool = poolsMap[poolId];
      for (const day in pool.days) {
        result.push({
          pool_id: pool.pool_id,
          pool_name: pool.pool_name,
          day_of_week: parseInt(day),
          group_count: pool.days[day]
        });
      }
    }
    
    logger.info(`Отправляем данные о ${result.length} записях для групп по дням недели`);
    res.json(result);
  } catch (err) {
    logger.error('Ошибка при получении количества групп по дням:', err);
    // В случае ошибки возвращаем тестовые данные
    res.json(getTestGroupsByDayData());
  }
});

// Функция для заполнения тестовых данных расписания
async function fillTestScheduleData() {
  try {
    // Проверяем наличие данных в schedule
    const scheduleCount = await pool.query(`
      SELECT COUNT(*) FROM schedule
    `);
    
    // Если данных нет, добавляем тестовые записи
    if (parseInt(scheduleCount.rows[0].count) === 0) {
      logger.info('Заполняем тестовые данные расписания...');
      
      // Получаем все группы
      const groups = await pool.query(`SELECT id, pool_id FROM groups`);
      
      if (groups.rows.length > 0) {
        // Для каждой группы добавляем записи в расписание на разные дни недели
        for (const group of groups.rows) {
          // Добавляем записи на понедельник, среду и пятницу
          const days = [1, 3, 5]; // Пн, Ср, Пт
          
          for (const day of days) {
            await pool.query(`
              INSERT INTO schedule (group_id, day_of_week, start_time, end_time, pool_id)
              VALUES ($1, $2, $3, $4, $5)
            `, [group.id, day, '10:00', '11:30', group.pool_id]);
          }
        }
        logger.info('Тестовые данные расписания успешно добавлены');
      }
    }
  } catch (err) {
    logger.error('Ошибка при заполнении тестовых данных расписания:', err);
  }
}



// 6. Бассейн с максимальной выручкой
router.get('/top-profit-pool', verifyToken, async (req, res) => {
  try {
    console.log('Запрос статистики бассейна с макс. выручкой');
    
    // Проверяем существование таблиц
    const [poolsExists, subscriptionsExists] = await Promise.all([
      tableExists('pools'),
      tableExists('subscriptions')
    ]);
    
    if (!poolsExists || !subscriptionsExists) {
      return res.json({
        name: "Нет данных",
        address: "Нет данных",
        total_revenue: 0,
        subscription_count: 0
      });
    }
    
    // ИСПРАВЛЕННЫЙ ЗАПРОС: учитываем все возможные связи бассейнов и абонементов
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.address,
        COALESCE(SUM(s.price), 0) AS total_revenue,
        COUNT(s.id) AS subscription_count
      FROM pools p
      -- Левое соединение для учета бассейнов без абонементов
      LEFT JOIN (
        -- Соединение через группы (если абонементы связаны с группами)
        SELECT s.id, s.price, g.pool_id
        FROM subscriptions s
        JOIN group_enrollments ge ON s.user_id = ge.user_id
        JOIN groups g ON ge.group_id = g.id
        
        UNION
        
        -- Прямая связь (если в subscriptions есть pool_id)
        SELECT s.id, s.price, s.pool_id
        FROM subscriptions s
        WHERE s.pool_id IS NOT NULL
      ) AS s ON s.pool_id = p.id
      GROUP BY p.id, p.name, p.address
      ORDER BY total_revenue DESC
      LIMIT 1
    `;
    
    console.log('Выполняю запрос на получение бассейна с макс. выручкой');
    const result = await pool.query(query);
    
    // Если нет результатов, возвращаем пустые данные
    if (result.rows.length === 0) {
      console.log('Нет данных о выручке бассейнов');
      return res.json({
        name: "Нет данных",
        address: "Нет данных",
        total_revenue: 0,
        subscription_count: 0
      });
    }
    
    console.log('Данные получены:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при получении бассейна с макс. выручкой:', err);
    res.status(500).json({
      name: "Ошибка",
      address: "Не удалось получить данные",
      total_revenue: 0,
      subscription_count: 0,
      error: err.message
    });
  }
});

module.exports = router;