const request = require('supertest');
const app = require('../index');
const db = require('../models/database');

describe('Auth API', () => {
  // Тестовый пользователь
  const testUser = {
    name: 'Test User',
    email: 'test-user@example.com',
    password: 'password123'
  };
  
  let authToken;

  // Выполняется перед всеми тестами
  beforeAll(async () => {
    // Очищаем тестовые данные
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });
  
  // Выполняется после всех тестов
  afterAll(async () => {
    // Очищаем тестовые данные
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await db.end();
  });

  // Тест регистрации
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
      
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('name', testUser.name);
    expect(res.body.user).toHaveProperty('email', testUser.email);
    
    // Сохраняем токен для следующих тестов
    authToken = res.body.token;
  });
  
  // Тест входа
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', testUser.email);
  });
  
  // Тест неудачного входа
  it('should not login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });
      
    expect(res.statusCode).toEqual(401);
  });
  
  // Тест профиля
  it('should get user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name', testUser.name);
    expect(res.body).toHaveProperty('email', testUser.email);
  });
  
  // Тест профиля без авторизации
  it('should not get profile without token', async () => {
    const res = await request(app)
      .get('/api/auth/profile');
      
    expect(res.statusCode).toEqual(401);
  });
});