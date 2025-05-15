/**
 * Middleware для валидации входных данных в API
 */

// Простая собственная реализация валидатора
class Validator {
  /**
   * Проверяет, что строка не пустая
   * @param {string} value - Проверяемое значение
   * @param {string} fieldName - Название поля для сообщения об ошибке
   * @returns {string|null} - Сообщение об ошибке или null, если проверка прошла
   */
  static notEmpty(value, fieldName) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return `Поле ${fieldName} не может быть пустым`;
    }
    return null;
  }

  /**
   * Проверяет минимальную длину строки
   * @param {string} value - Проверяемое значение
   * @param {number} min - Минимальная длина
   * @param {string} fieldName - Название поля для сообщения об ошибке
   * @returns {string|null} - Сообщение об ошибке или null, если проверка прошла
   */
  static minLength(value, min, fieldName) {
    if (!value || typeof value !== 'string' || value.length < min) {
      return `${fieldName} должен содержать не менее ${min} символов`;
    }
    return null;
  }

  /**
   * Проверяет, что значение является email-адресом
   * @param {string} value - Проверяемое значение
   * @returns {string|null} - Сообщение об ошибке или null, если проверка прошла
   */
  static isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || typeof value !== 'string' || !emailRegex.test(value)) {
      return 'Некорректный формат email';
    }
    return null;
  }

  /**
   * Проверяет, что значение является числом
   * @param {any} value - Проверяемое значение
   * @param {string} fieldName - Название поля для сообщения об ошибке
   * @returns {string|null} - Сообщение об ошибке или null, если проверка прошла
   */
  static isNumber(value, fieldName) {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return `${fieldName} должно быть числом`;
    }
    return null;
  }

  /**
   * Проверяет, что значение находится в допустимом диапазоне
   * @param {number} value - Проверяемое значение
   * @param {number} min - Минимальное значение
   * @param {number} max - Максимальное значение
   * @param {string} fieldName - Название поля для сообщения об ошибке
   * @returns {string|null} - Сообщение об ошибке или null, если проверка прошла
   */
  static range(value, min, max, fieldName) {
    const num = Number(value);
    if (num < min || num > max) {
      return `${fieldName} должно быть от ${min} до ${max}`;
    }
    return null;
  }
}

// Валидация для регистрации пользователя
const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Проверка имени
  const nameError = Validator.notEmpty(name, 'Имя');
  if (nameError) errors.push(nameError);

  // Проверка email
  const emailError = Validator.isEmail(email);
  if (emailError) errors.push(emailError);

  // Проверка пароля
  const passwordError = Validator.minLength(password, 6, 'Пароль');
  if (passwordError) errors.push(passwordError);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Валидация для входа в систему
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Проверка email
  const emailError = Validator.isEmail(email);
  if (emailError) errors.push(emailError);

  // Проверка пароля
  const passwordError = Validator.notEmpty(password, 'Пароль');
  if (passwordError) errors.push(passwordError);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Валидация для создания группы
const validateGroup = (req, res, next) => {
  const { name, coachId, capacity, description } = req.body;
  const errors = [];

  // Проверка названия
  const nameError = Validator.notEmpty(name, 'Название группы');
  if (nameError) errors.push(nameError);

  // Проверка ID тренера
  const coachIdError = Validator.isNumber(coachId, 'ID тренера');
  if (coachIdError) errors.push(coachIdError);

  // Проверка вместимости
  const capacityError = Validator.isNumber(capacity, 'Вместимость группы');
  if (capacityError) errors.push(capacityError);
  else {
    const rangeError = Validator.range(capacity, 1, 50, 'Вместимость группы');
    if (rangeError) errors.push(rangeError);
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateGroup
};