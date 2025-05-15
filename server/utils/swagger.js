/**
 * Конфигурация Swagger для документации API
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'АкваМир API',
    version: '1.0.0',
    description: 'API для управления бассейном АкваМир',
    contact: {
      name: 'Команда разработки',
      email: 'dev@aquaworld.ru'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Локальный сервер для разработки'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Авторизация и регистрация'
    },
    {
      name: 'Groups',
      description: 'Управление группами'
    },
    {
      name: 'Subscriptions',
      description: 'Управление абонементами'
    },
    {
      name: 'Schedule',
      description: 'Расписание занятий'
    },
    {
      name: 'Notifications',
      description: 'Уведомления пользователей'
    },
    {
      name: 'Profile',
      description: 'Управление профилем'
    }
  ],
  paths: {
    // Примеры документации маршрутов
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Регистрация нового пользователя',
        security: [], // Не требует авторизации
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: {
                    type: 'string',
                    example: 'Иван Иванов'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ivan@example.com'
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    example: 'password123'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Успешная регистрация',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: {
                      type: 'string'
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'integer'
                        },
                        name: {
                          type: 'string'
                        },
                        email: {
                          type: 'string'
                        },
                        role: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Ошибка валидации'
          },
          409: {
            description: 'Пользователь с таким email уже существует'
          },
          500: {
            description: 'Внутренняя ошибка сервера'
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Вход в систему',
        security: [], // Не требует авторизации
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ivan@example.com'
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    example: 'password123'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Успешный вход',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: {
                      type: 'string'
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'integer'
                        },
                        name: {
                          type: 'string'
                        },
                        email: {
                          type: 'string'
                        },
                        role: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Неверный email или пароль'
          },
          500: {
            description: 'Внутренняя ошибка сервера'
          }
        }
      }
    },
    // Другие маршруты можно добавить аналогично...
  }
};

module.exports = {
  swaggerDefinition,
  apis: ['./routes/*.js'] // Пути к файлам маршрутов
};