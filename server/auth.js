const express = require('express');
const router = express.Router();
const db = require('./db'); 

// Регистрация
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const exists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
      [name, email, password]
    );

    res.status(201).json({ message: 'Регистрация успешна' });
  } catch (err) {
    console.log(err.message);   
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Авторизация
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    res.json({ message: 'Вход выполнен', name: user.rows[0].name });
  } catch (err) {
    console.log(err.message);   
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
