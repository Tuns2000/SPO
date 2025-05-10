import React, { useState } from 'react';
import axios from 'axios';

function Subscription() {
  const [form, setForm] = useState({ userId: '', type: '', price: '' });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    axios.post('http://localhost:3000/api/subscription', form)
      .then(() => alert('Абонемент оформлен!'))
      .catch(() => alert('Ошибка'));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Оформление абонемента</h2>
      <input name="userId" placeholder="ID пользователя" onChange={handleChange} /><br />
      <input name="type" placeholder="Тип абонемента" onChange={handleChange} /><br />
      <input name="price" placeholder="Стоимость" onChange={handleChange} /><br />
      <button type="submit">Оформить</button>
    </form>
  );
}

export default Subscription;
