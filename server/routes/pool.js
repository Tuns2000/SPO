// Создайте файл server/routes/pool.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth'); // Правильный импорт
const { roleMiddleware } = require('../middleware/role'); // Правильный импорт

// Создаем псевдоним для совместимости с существующим кодом
const authMiddleware = verifyToken;

// Получение списка всех бассейнов
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM pools 
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении списка бассейнов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение конкретного бассейна
router.get('/:id', async (req, res) => {
  try {
    const poolId = req.params.id;
    
    const poolResult = await pool.query(`
      SELECT * FROM pools WHERE id = $1
    `, [poolId]);
    
    if (poolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Бассейн не найден' });
    }
    
    // Получаем тренеров этого бассейна
    const coachesResult = await pool.query(`
      SELECT c.id, u.name, c.specialty, c.experience, c.rating 
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      WHERE c.pool_id = $1
    `, [poolId]);
    
    // Получаем группы этого бассейна
    const groupsResult = await pool.query(`
      SELECT g.*, 
             COUNT(ge.id) as enrolled_count,
             u.name as coach_name
      FROM groups g
      JOIN coaches c ON g.coach_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN group_enrollments ge ON g.id = ge.group_id AND ge.status = 'active'
      WHERE g.pool_id = $1
      GROUP BY g.id, u.name
      ORDER BY g.name
    `, [poolId]);
    
    // Формируем полный ответ
    const poolData = {
      ...poolResult.rows[0],
      coaches: coachesResult.rows,
      groups: groupsResult.rows
    };
    
    res.json(poolData);
  } catch (err) {
    console.error('Ошибка при получении данных о бассейне:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавление нового бассейна (только для администратора)
router.post('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { name, address, type } = req.body;
    
    // Проверка входных данных
    if (!name || !address || !type) {
      return res.status(400).json({ error: 'Не указаны все обязательные поля' });
    }
    
    // Проверка типа бассейна
    if (!['sport', 'health', 'combined'].includes(type)) {
      return res.status(400).json({ error: 'Неверный тип бассейна' });
    }
    
    const result = await pool.query(`
      INSERT INTO pools (name, address, type)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, address, type]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании бассейна:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление данных бассейна (только для администратора)
router.put('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const poolId = req.params.id;
    const { name, address, type } = req.body;
    
    // Проверка типа бассейна
    if (type && !['sport', 'health', 'combined'].includes(type)) {
      return res.status(400).json({ error: 'Неверный тип бассейна' });
    }
    
    // Проверяем существование бассейна
    const checkResult = await pool.query('SELECT * FROM pools WHERE id = $1', [poolId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Бассейн не найден' });
    }
    
    // Формируем части запроса для обновления
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    
    if (address) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }
    
    if (type) {
      updates.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Не указаны поля для обновления' });
    }
    
    // Добавляем ID в массив значений
    values.push(poolId);
    
    // Выполняем обновление
    const result = await pool.query(`
      UPDATE pools
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении данных бассейна:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление бассейна (только для администратора)
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const poolId = req.params.id;
    
    // Проверяем, есть ли тренеры, связанные с этим бассейном
    const coachesCheck = await pool.query('SELECT id FROM coaches WHERE pool_id = $1', [poolId]);
    if (coachesCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Невозможно удалить бассейн, так как с ним связаны тренеры' 
      });
    }
    
    // Проверяем, есть ли группы, связанные с этим бассейном
    const groupsCheck = await pool.query('SELECT id FROM groups WHERE pool_id = $1', [poolId]);
    if (groupsCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Невозможно удалить бассейн, так как с ним связаны группы' 
      });
    }
    
    // Выполняем удаление
    await pool.query('DELETE FROM pools WHERE id = $1', [poolId]);
    
    res.json({ message: 'Бассейн успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении бассейна:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Маршрут для получения статистики
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const poolId = req.params.id;
    
    // Проверяем существование бассейна
    const poolCheck = await pool.query('SELECT * FROM pools WHERE id = $1', [poolId]);
    if (poolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Бассейн не найден' });
    }
    
    // Количество групп по дням недели
    const groupsByDay = await pool.query(`
      SELECT 
        extract(dow from s.date) as day_of_week,
        count(distinct g.id) as group_count
      FROM schedules s
      JOIN groups g ON s.group_id = g.id
      WHERE g.pool_id = $1
      GROUP BY day_of_week
      ORDER BY day_of_week
    `, [poolId]);
    
    // Общая выручка бассейна
    const revenue = await pool.query(`
      SELECT COALESCE(SUM(s.price), 0) as total_revenue
      FROM subscriptions s
      JOIN group_enrollments ge ON ge.user_id = s.user_id
      JOIN groups g ON ge.group_id = g.id
      WHERE g.pool_id = $1 AND ge.status = 'active'
    `, [poolId]);
    
    // Выручка по тренерам
    const coachRevenue = await pool.query(`
      SELECT 
        c.id as coach_id,
        u.name as coach_name,
        COALESCE(SUM(s.price), 0) as revenue
      FROM coaches c
      JOIN users u ON c.user_id = u.id
      JOIN groups g ON g.coach_id = c.id
      LEFT JOIN group_enrollments ge ON ge.group_id = g.id AND ge.status = 'active'
      LEFT JOIN subscriptions s ON s.user_id = ge.user_id
      WHERE c.pool_id = $1
      GROUP BY c.id, u.name
      ORDER BY revenue DESC
    `, [poolId]);
    
    res.json({
      groups_by_day: groupsByDay.rows,
      total_revenue: revenue.rows[0].total_revenue,
      coach_revenue: coachRevenue.rows
    });
  } catch (err) {
    console.error('Ошибка при получении статистики бассейна:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;