const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth'); // Изменен импорт auth

// Получение всех абонементов для администратора
router.get('/admin/subscriptions', verifyToken, async (req, res) => { // Заменен auth на verifyToken
  try {
    // Проверка на роль администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const result = await pool.query(`
      SELECT s.*, u.name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка абонементов:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Получение абонементов пользователя
router.get('/subscriptions', verifyToken, async (req, res) => { // Заменен auth на verifyToken
  try {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении абонементов пользователя:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Создание нового абонемента
router.post('/subscriptions', verifyToken, async (req, res) => { // Заменен auth на verifyToken
  try {
    const { subscription_type, start_date, end_date, personal_trainer, additional_services, total_price } = req.body;
    
    // Проверка обязательных полей
    if (!subscription_type) {
      return res.status(400).json({ message: 'Тип абонемента обязателен' });
    }
    
    // Определение количества посещений на основе типа абонемента
    let visits_left = null;
    if (subscription_type === 'single') {
      visits_left = 1;
    }
    
    const result = await pool.query(`
      INSERT INTO subscriptions 
      (user_id, type, start_date, end_date, visits_left, personal_trainer, additional_services, price, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user.id, subscription_type, start_date, end_date, visits_left, 
      personal_trainer || false, additional_services || [], total_price || 0, 'active'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании абонемента:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Маршрут для обновления абонемента администратором
router.put('/subscriptions/:id/update', verifyToken, async (req, res) => {
  try {
    // Проверка, что пользователь является администратором
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const { type, start_date, end_date, visits_left, status, price } = req.body;

    // Проверка, существует ли такой абонемент
    const checkSubscription = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (checkSubscription.rows.length === 0) {
      return res.status(404).json({ message: 'Абонемент не найден' });
    }

    // Обновление данных абонемента - убираем updated_at
    const result = await pool.query(
      `UPDATE subscriptions 
       SET type = $1, start_date = $2, end_date = $3, visits_left = $4, status = $5, price = $6
       WHERE id = $7
       RETURNING *`,
      [type, start_date, end_date, visits_left, status, price, id]
    );

    // Получаем обновленный абонемент с информацией о пользователе
    const updatedSubscription = await pool.query(
      `SELECT s.*, u.name, u.email
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    res.json(updatedSubscription.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении абонемента:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Находим функцию обновления абонемента (примерно строка 98)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, subscription_type_id, expiry_date, active } = req.body;

    // Правильная проверка даты
    const formattedExpiryDate = expiry_date && expiry_date.trim() !== '' 
      ? expiry_date 
      : null; // Используем NULL вместо пустой строки
    
    const result = await pool.query(
      'UPDATE subscriptions SET user_id = $1, subscription_type_id = $2, expiry_date = $3, active = $4 WHERE id = $5 RETURNING *',
      [user_id, subscription_type_id, formattedExpiryDate, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Абонемент не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении абонемента:', err);
    res.status(500).json({ message: 'Ошибка сервера', error: err.message });
  }
});

module.exports = router;