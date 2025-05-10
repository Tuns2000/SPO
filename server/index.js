const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const scheduleRoutes = require('./routes/schedule');

app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/schedule', scheduleRoutes);

app.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});
