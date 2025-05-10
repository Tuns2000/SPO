import React, { useState } from 'react';
import axios from 'axios';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    axios.post('http://localhost:3000/api/auth/login', form)
      .then(() => alert('Вход выполнен!'))
      .catch(() => alert('Ошибка входа'));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Вход</h2>
      <input name="email" placeholder="Email" onChange={handleChange} /><br />
      <input name="password" type="password" placeholder="Пароль" onChange={handleChange} /><br />
      <button type="submit">Войти</button>
    </form>
  );
}

export default Login;
