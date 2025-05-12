const db = require('./database');

// Паттерн Observer для уведомлений

// Интерфейс наблюдателя
class Observer {
  update(data) {
    throw new Error('update method must be implemented');
  }
}

// Конкретный наблюдатель - пользователь
class UserObserver extends Observer {
  constructor(userId) {
    super();
    this.userId = userId;
  }

  async update(data) {
    // Сохранение уведомления в БД для конкретного пользователя
    try {
      await db.query(
        'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
        [this.userId, data.title, data.message]
      );
      console.log(`Notification sent to user ${this.userId}:`, data);
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }
}

// Конкретный наблюдатель - администратор (получает все важные уведомления)
class AdminObserver extends Observer {
  constructor() {
    super();
  }

  async update(data) {
    // Находим всех администраторов и отправляем им уведомления
    try {
      const admins = await db.query('SELECT id FROM users WHERE role = $1', ['admin']);
      
      // Отправляем уведомления всем администраторам
      for (const admin of admins.rows) {
        await db.query(
          'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
          [admin.id, `ADMIN: ${data.title}`, data.message]
        );
      }
      console.log(`Admin notification sent:`, data);
    } catch (err) {
      console.error('Error sending admin notification:', err);
    }
  }
}

// Субъект наблюдения
class NotificationSubject {
  constructor() {
    this.observers = [];
  }

  attach(observer) {
    const isExist = this.observers.includes(observer);
    if (!isExist) {
      this.observers.push(observer);
    }
    return this;
  }

  detach(observer) {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex !== -1) {
      this.observers.splice(observerIndex, 1);
    }
    return this;
  }

  // Уведомление всех наблюдателей
  notify(data) {
    for (const observer of this.observers) {
      observer.update(data);
    }
  }
}

// Сервис уведомлений
class NotificationService {
  constructor() {
    this.subject = new NotificationSubject();
  }

  // Отправка уведомления конкретному пользователю
  async notifyUser(userId, title, message) {
    const observer = new UserObserver(userId);
    this.subject.attach(observer);
    this.subject.notify({ title, message });
    this.subject.detach(observer);
  }

  // Отправка уведомления всем администраторам
  async notifyAdmins(title, message) {
    const observer = new AdminObserver();
    this.subject.attach(observer);
    this.subject.notify({ title, message });
    this.subject.detach(observer);
  }

  // Получение уведомлений пользователя
  async getUserNotifications(userId) {
    try {
      const result = await db.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } catch (err) {
      console.error('Error getting notifications:', err);
      return [];
    }
  }

  // Отметка уведомления как прочитанное
  async markAsRead(notificationId) {
    try {
      await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [notificationId]);
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }
}

module.exports = { NotificationService };