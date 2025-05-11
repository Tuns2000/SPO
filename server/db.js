const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',         // имя пользователя PostgreSQL
  host: 'localhost',
  database: 'SPO', // замени на название своей БД
  password: 'ArtemB1998', // пароль PostgreSQL
  port: 5432,
});
module.exports = pool;
