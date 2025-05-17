const express = require('express');
const router = express.Router();
const pool = require('../db');  // Правильный импорт pool
const { verifyToken } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/role');

// Создаем псевдоним для совместимости с существующим кодом
const authMiddleware = verifyToken;

// Оформление нового абонемента
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;
    
    console.log('Получен запрос на создание абонемента:', req.body);
    
    // Проверка типа абонемента
    if (!type || !['single', 'monthly', 'quarterly', 'annual'].includes(type)) {
      return res.status(400).json({ 
        error: 'Неверный тип абонемента. Доступные типы: single, monthly, quarterly, annual'
      });
    }
    
    // Проверяем, что таблица subscriptions существует
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Создаем таблицу subscriptions, если она не существует
      await pool.query(`
        CREATE TABLE subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL DEFAULT CURRENT_DATE,
          end_date DATE,
          visits_left INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Таблица subscriptions создана');
    }
    
    // Проверяем существование колонки price
    const priceColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'price'
      );
    `);
    
    // Определяем параметры абонемента в зависимости от типа
    let endDate, visitsLeft, price;
    
    switch (type) {
      case 'single':
        endDate = null;
        visitsLeft = 1;
        price = 500; // цена разового посещения
        break;
      case 'monthly':
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        visitsLeft = 30;
        price = 3000; // цена месячного абонемента
        break;
      case 'quarterly':
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
        visitsLeft = 90;
        price = 7500; // цена квартального абонемента
        break;
      case 'annual':
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        visitsLeft = 365;
        price = 25000; // цена годового абонемента
        break;
    }
    
    // Создаем новый абонемент
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, type, end_date, visits_left, price) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, type, start_date, end_date, visits_left, status, price`,
      [userId, type, endDate, visitsLeft, price]
    );
    
    res.status(201).json({
      message: 'Абонемент успешно создан',
      subscription: result.rows[0]
    });
    
  } catch (err) {
    console.error('Ошибка при создании абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение всех абонементов пользователя
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Проверяем существование таблицы перед запросом
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Если таблицы нет, возвращаем пустой массив
      return res.json([]);
    }
    
    // Проверяем существование колонки visits_left
    const visitsLeftColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'visits_left'
      );
    `);
    
    // Если колонки нет, добавляем её
    if (!visitsLeftColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN visits_left INTEGER;
      `);
      console.log('Колонка visits_left добавлена в таблицу subscriptions');
    }
    
    // Проверяем существование колонки status
    const statusColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'status'
      );
    `);
    
    // Если колонки status нет, добавляем её
    if (!statusColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active';
      `);
      console.log('Колонка status добавлена в таблицу subscriptions');
    }
    
    // Проверяем существование колонки created_at
    const createdAtColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'created_at'
      );
    `);
    
    // Если колонки created_at нет, добавляем её
    if (!createdAtColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('Колонка created_at добавлена в таблицу subscriptions');
    }
    
    const result = await pool.query(`
      SELECT id, type, start_date, end_date, visits_left, status, created_at, price
      FROM subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    // Преобразуем результаты, добавляя поле is_expired
    const subscriptions = result.rows.map(sub => {
      // Определяем, истек ли абонемент
      let is_expired = false;
      
      if (sub.end_date && new Date(sub.end_date) < new Date()) {
        is_expired = true; // Истек по дате
      } else if (sub.visits_left !== null && sub.visits_left <= 0) {
        is_expired = true; // Истекли посещения
      } else if (sub.status === 'inactive' || sub.status === 'cancelled') {
        is_expired = true; // Неактивен по статусу
      }
      
      return {
        ...sub,
        is_expired
      };
    });
    
    res.json(subscriptions);
  } catch (err) {
    console.error('Ошибка при получении абонементов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Только для админа - получение всех абонементов
router.get('/all', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name, u.email 
      FROM subscriptions s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.start_date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при получении всех абонементов' });
  }
});

// Отмена абонемента
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = req.params.id;
    
    // Проверяем, принадлежит ли абонемент пользователю
    const checkResult = await pool.query(
      'SELECT id FROM subscriptions WHERE id = $1 AND user_id = $2',
      [subscriptionId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Абонемент не найден' });
    }
    
    // Деактивируем абонемент (не удаляем полностью из БД)
    await pool.query(
      'UPDATE subscriptions SET active = FALSE WHERE id = $1',
      [subscriptionId]
    );
    
    res.json({ message: 'Абонемент успешно отменен' });
  } catch (err) {
    console.error('Ошибка при отмене абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавьте этот маршрут:
router.get('/', async (req, res) => {
  try {
    // Проверяем существование таблицы subscription_plans
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscription_plans'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Если таблицы нет, создаем её с базовыми планами
      await pool.query(`
        CREATE TABLE subscription_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          visits INTEGER,
          period_days INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Добавляем базовые планы
      await pool.query(`
        INSERT INTO subscription_plans (name, description, price, visits, period_days)
        VALUES
          ('Разовое посещение', 'Одно посещение бассейна', 500, 1, 1),
          ('Месячный абонемент', 'Неограниченное посещение в течение месяца', 3000, 30, 30),
          ('Квартальный абонемент', 'Неограниченное посещение в течение 3 месяцев', 7500, 90, 90),
          ('Годовой абонемент', 'Неограниченное посещение в течение года', 25000, 365, 365)
      `);
    }
    
    // Получаем все планы подписок
    const result = await pool.query(`
      SELECT * FROM subscription_plans ORDER BY price ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении планов подписок:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
  
// Добавьте этот маршрут сразу после импортов, до всех других маршрутов
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;
    
    console.log('Получен запрос на создание абонемента через корневой маршрут:', req.body);
    
    // Проверка типа абонемента
    if (!type || !['single', 'monthly', 'quarterly', 'annual'].includes(type)) {
      return res.status(400).json({ 
        error: 'Неверный тип абонемента. Доступные типы: single, monthly, quarterly, annual'
      });
    }
    
    // Проверяем, что таблица subscriptions существует
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Создаем таблицу subscriptions
      await pool.query(`
        CREATE TABLE subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL DEFAULT CURRENT_DATE,
          end_date DATE,
          visits_left INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Таблица subscriptions создана');
    }
    
    // Проверяем, есть ли поле price
    const priceColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'price'
      );
    `);
    
    // Если столбца price нет, добавляем его
    if (!priceColumnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE subscriptions 
        ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
      `);
      console.log('Колонка price добавлена в таблицу subscriptions');
    }
    
    // Определяем параметры абонемента в зависимости от типа
    let endDate, visitsLeft, price;
    
    switch (type) {
      case 'single':
        endDate = null;
        visitsLeft = 1;
        price = 500;
        break;
      case 'monthly':
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        visitsLeft = 30;
        price = 3000;
        break;
      case 'quarterly':
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
        visitsLeft = 90;
        price = 7500;
        break;
      case 'annual':
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        visitsLeft = 365;
        price = 25000;
        break;
    }
    
    // Создаем новый абонемент
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, type, end_date, visits_left, price) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, type, start_date, end_date, visits_left, status, price`,
      [userId, type, endDate, visitsLeft, price]
    );
    
    res.status(201).json({
      message: 'Абонемент успешно создан',
      subscription: result.rows[0]
    });
    
  } catch (err) {
    console.error('Ошибка при создании абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
