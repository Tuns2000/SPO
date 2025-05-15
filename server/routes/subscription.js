const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const { NotificationService } = require('../models/notification-observer');

const notificationService = new NotificationService();

// Оформление нового абонемента
router.post('/', auth, async (req, res) => {
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
      // Если таблицы нет, создаем её
      await pool.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type VARCHAR(50) NOT NULL,
          description VARCHAR(255),
          start_date DATE DEFAULT CURRENT_DATE,
          end_date DATE NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          active BOOLEAN DEFAULT TRUE
        );
      `);
    }
    
    // Определяем параметры абонемента
    let duration, price, description;
    
    switch(type) {
      case 'single':
        duration = 1; // 1 день
        price = 500;
        description = 'Разовое посещение';
        break;
      case 'monthly':
        duration = 30; // 30 дней
        price = 5000;
        description = 'Месячный абонемент';
        break;
      case 'quarterly':
        duration = 90; // 90 дней
        price = 12000;
        description = 'Квартальный абонемент';
        break;
      case 'annual':
        duration = 365; // 365 дней
        price = 40000;
        description = 'Годовой абонемент';
        break;
    }
    
    // Создаем новый абонемент
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, type, description, start_date, end_date, price, active)
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '${duration} days', $4, TRUE)
       RETURNING id, type, description, start_date, end_date, price, active`,
      [userId, type, description, price]
    );
    
    const subscription = result.rows[0];
    
    // Возвращаем информацию о новом абонементе
    res.status(201).json({
      message: 'Абонемент успешно оформлен',
      subscription
    });
    
  } catch (err) {
    console.error('Ошибка при оформлении абонемента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение всех абонементов пользователя
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Проверяем, что таблица subscriptions существует
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Если таблицы нет, создаем её
      await pool.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type VARCHAR(50) NOT NULL,
          description VARCHAR(255),
          start_date DATE DEFAULT CURRENT_DATE,
          end_date DATE NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          active BOOLEAN DEFAULT TRUE
        );
      `);
      
      // Если таблица только что создана, вернем пустой массив
      return res.json([]);
    }
    
    // Запрашиваем абонементы пользователя
    const result = await pool.query(
      `SELECT id, type, description, start_date, end_date, price, active 
       FROM subscriptions 
       WHERE user_id = $1
       ORDER BY start_date DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении абонементов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Только для админа - получение всех абонементов
router.get('/all', auth, roleMiddleware(['admin']), async (req, res) => {
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
router.delete('/:id', auth, async (req, res) => {
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

module.exports = router;
