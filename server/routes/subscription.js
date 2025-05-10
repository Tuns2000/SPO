const express = require('express');
const router = express.Router();

const subscriptions = [];

router.post('/', (req, res) => {
    const { userId, type, price } = req.body;
    subscriptions.push({ userId, type, price, date: new Date() });
    res.json({ message: 'Абонемент оформлен' });
});

module.exports = router;
