import React, { createContext, useState } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(false);

  const addNotification = (notification) => {
    setNotifications((prevNotifications) => [...prevNotifications, notification]);
  };

  const toggleVisibility = () => {
    setVisible(!visible);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, visible, toggleVisibility }}>
      {children}
    </NotificationContext.Provider>
  );
};