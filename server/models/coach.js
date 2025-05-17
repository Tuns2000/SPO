// Создайте файл server/models/coach.js
const WEEKDAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7
};

class Coach {
  constructor(id, userId, name, specialty, poolId, workingDays = []) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.specialty = specialty;
    this.poolId = poolId;
    this.workingDays = workingDays;
  }
  
  // Проверка, работает ли тренер в определенный день
  worksOnDay(day) {
    return this.workingDays.includes(day);
  }
  
  // Получение строкового представления рабочих дней
  getWorkingDaysText() {
    const dayNames = {
      1: 'Понедельник',
      2: 'Вторник',
      3: 'Среда',
      4: 'Четверг',
      5: 'Пятница',
      6: 'Суббота',
      7: 'Воскресенье'
    };
    
    return this.workingDays.map(day => dayNames[day]).join(', ');
  }
}

module.exports = {
  Coach,
  WEEKDAYS
};