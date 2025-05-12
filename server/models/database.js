const { Pool } = require('pg');

class Database {
  constructor() {
    this._pool = null;
  }

  // Реализация паттерна Singleton
  get pool() {
    if (this._pool === null) {
      this._pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'SPO',
        password: 'ArtemB1998',
        port: 5432,
      });
      
      // Обработка событий подключения
      this._pool.on('error', (err) => {
        console.error('Unexpected error on idle database client', err);
      });
      
      console.log('Database connection pool created');
    }
    return this._pool;
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }
}

// Экспортируем единственный экземпляр класса Database
const db = new Database();
module.exports = db;