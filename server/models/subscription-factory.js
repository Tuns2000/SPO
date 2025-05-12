// Паттерн Factory Method для создания различных типов абонементов

// Абстрактный класс абонемента
class Subscription {
  constructor(userId) {
    this.userId = userId;
    this.type = '';
    this.price = 0;
    this.durationDays = 0;
  }

  getDetails() {
    return {
      type: this.type,
      price: this.price,
      durationDays: this.durationDays
    };
  }
}

// Конкретные реализации абонементов
class SingleVisit extends Subscription {
  constructor(userId) {
    super(userId);
    this.type = 'single';
    this.price = 500;
    this.durationDays = 1;
  }
}

class MonthlySubscription extends Subscription {
  constructor(userId) {
    super(userId);
    this.type = 'monthly';
    this.price = 5000;
    this.durationDays = 30;
  }
}

class QuarterlySubscription extends Subscription {
  constructor(userId) {
    super(userId);
    this.type = 'quarterly';
    this.price = 12000;
    this.durationDays = 90;
  }
}

class AnnualSubscription extends Subscription {
  constructor(userId) {
    super(userId);
    this.type = 'annual';
    this.price = 40000;
    this.durationDays = 365;
  }
}

class FamilySubscription extends Subscription {
  constructor(userId) {
    super(userId);
    this.type = 'family';
    this.price = 15000;
    this.durationDays = 30;
    this.familySize = 4; // Максимальное количество членов семьи
  }

  getDetails() {
    return {
      ...super.getDetails(),
      familySize: this.familySize
    };
  }
}

// Фабрика абонементов
class SubscriptionFactory {
  createSubscription(type, userId) {
    switch(type.toLowerCase()) {
      case 'single':
        return new SingleVisit(userId);
      case 'monthly':
        return new MonthlySubscription(userId);
      case 'quarterly':
        return new QuarterlySubscription(userId);
      case 'annual':
        return new AnnualSubscription(userId);
      case 'family':
        return new FamilySubscription(userId);
      default:
        throw new Error('Unknown subscription type');
    }
  }
}

module.exports = SubscriptionFactory;