const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const { NotificationService } = require('../models/notification-observer');

const notificationService = new NotificationService();

// Маршрут для оформления нового абонемента
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;
    
    // Проверяем тип абонемента
    if (!type || !['single', 'monthly', 'quarterly', 'annual'].includes(type)) {
      return res.status(400).json({ 
        error: 'Неверный тип абонемента. Доступные типы: single, monthly, quarterly, annual'
      });
    }
    
    // Определяем продолжительность и цену абонемента
    let duration, price;
    
    switch (type) {
      case 'single':
        duration = 1;
        price = 500;
        break;
      case 'monthly':
        duration = 30;
        price = 5000;
        break;
      case 'quarterly':
        duration = 90;
        price = 12000;
        break;
      case 'annual':
        duration = 365;
        price = 40000;
        break;
    }
    
    // Создаем новый абонемент
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, type, start_date, end_date, price, active)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '${duration} days', $3, TRUE)
       RETURNING id, type, start_date, end_date, price, active`,
      [userId, type, price]
    );
    
    const subscription = result.rows[0];
    
    // Отправка уведомления пользователю
    await notificationService.notifyUser(
      userId,
      'Абонемент оформлен',
      `Вы успешно оформили абонемент "${type}". Действует до ${subscription.end_date}.`
    );

    // Отправка уведомления администраторам
    await notificationService.notifyAdmins(
      'Новый абонемент',
      `Пользователь ${req.user.email} оформил абонемент "${type}".`
    );

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

// Добавим маршрут для получения абонементов пользователя
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, type, start_date, end_date, price, active 
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
router.put('/:id/cancel', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Проверка, принадлежит ли абонемент пользователю или является ли пользователь админом
    const subscription = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (subscription.rows.length === 0) {
      return res.status(404).json({ error: 'Абонемент не найден' });
    }

    if (subscription.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Отмена абонемента
    await pool.query(
      'UPDATE subscriptions SET active = false WHERE id = $1',
      [id]
    );

    // Отправка уведомления
    await notificationService.notifyUser(
      subscription.rows[0].user_id,
      'Абонемент отменен',
      `Абонемент "${subscription.rows[0].type}" был отменен.`
    );

    res.json({ message: 'Абонемент успешно отменен' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при отмене абонемента' });
  }
});

module.exports = router;
