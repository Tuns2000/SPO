const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/database');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');  // Изменено здесь

const JWT_SECRET = process.env.JWT_SECRET || 'BOMBA';

// Регистрация
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'client' } = req.body;

  try {
    // Проверка существования пользователя
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Сохранение пользователя с указанием роли
    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    const user = result.rows[0];

    // Создание JWT токена с информацией о роли
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Регистрация успешна',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Авторизация
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Поиск пользователя по email
    const result = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const user = result.rows[0];
    
    // Сравнение паролей
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    // Создание JWT токена с более длительным сроком действия
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'BOMBA',
      { expiresIn: '7d' }  // Увеличиваем срок до 7 дней вместо 24h
    );
    
    // Возвращаем информацию о пользователе и токен
    // ВАЖНО: Структура данных должна соответствовать ожиданиям клиента
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение профиля пользователя
router.get('/profile', verifyToken, async (req, res) => {  // Изменено здесь
  try {
    const userId = req.user.id;
    console.log('Запрос профиля для пользователя ID:', userId);
    
    // Запрос базовых данных пользователя
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    console.log('Результат запроса пользователя:', userResult.rows);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    // Если пользователь - тренер, добавляем информацию о тренере
    if (user.role === 'coach') {
      const coachResult = await pool.query(
        'SELECT specialty, experience, rating, description FROM coaches WHERE user_id = $1',
        [userId]
      );
      
      if (coachResult.rows.length > 0) {
        user.coach_info = coachResult.rows[0];
      }
    }
    
    res.json(user);
  } catch (err) {
    console.error('Ошибка при получении профиля:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;