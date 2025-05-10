import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    axios.post('http://localhost:3000/api/auth/register', form)
      .then(() => alert('Регистрация успешна!'))
      .catch(err => alert('Ошибка регистрации'));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Регистрация</h2>
      <input name="name" placeholder="Имя" onChange={handleChange} /><br />
      <input name="email" placeholder="Email" onChange={handleChange} /><br />
      <input name="password" type="password" placeholder="Пароль" onChange={handleChange} /><br />
      <button type="submit">Зарегистрироваться</button>
    </form>
  );
}

export default Register;
