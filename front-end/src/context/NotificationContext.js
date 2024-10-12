// NotificationContext.js
import React, { createContext, useState } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]); // ประกาศ setNotifications
  const [visible, setVisible] = useState(false);

  const addNotification = (notification) => {
    setNotifications((prevNotifications) => [...prevNotifications, notification]);
  };

  const toggleVisibility = () => {
    setVisible((prevVisible) => !prevVisible);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, visible, toggleVisibility, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

