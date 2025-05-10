const express = require('express');
const router = express.Router();

const users = [];

router.post('/register', (req, res) => {
    const { email, password, name } = req.body;
    users.push({ email, password, name });
    res.status(201).json({ message: 'Регистрация успешна' });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ message: 'Вход выполнен' });
    } else {
        res.status(401).json({ error: 'Неверные данные' });
    }
});

module.exports = router;
