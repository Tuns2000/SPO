import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');

  // Загрузка информации о пользователе при монтировании компонента
  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get('http://localhost:3000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCurrentUser(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке профиля:', err);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [token]);

  // Функция обновления пользователя - вызывается после редактирования
  const updateUserData = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get('http://localhost:3000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentUser(response.data);
      
      // Также обновляем данные в localStorage
      localStorage.setItem('user', response.data.name);
      localStorage.setItem('role', response.data.role);
    } catch (err) {
      console.error('Ошибка при обновлении данных пользователя:', err);
    }
  };

  // Глобальная функция для обновления данных пользователя по ID
  const refreshUserById = async (userId) => {
    // Если это текущий пользователь, обновляем его данные
    if (currentUser && currentUser.id === userId) {
      await updateUserData();
    }
  };

  const value = {
    currentUser,
    loading,
    updateUserData,
    refreshUserById
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};