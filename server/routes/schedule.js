const express = require('express');
const router = express.Router();

const schedule = [
    { id: 1, group: 'Йога', time: '10:00', coach: 'Иванов' },
    { id: 2, group: 'Плавание', time: '12:00', coach: 'Петров' },
];

router.get('/', (req, res) => {
    res.json(schedule);
});

module.exports = router;
