// NotificationContext.js
import React, { createContext, useState, useMemo } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(false);

  const addNotification = (notification) => {
    setNotifications((prevNotifications) => [...prevNotifications, notification]);
  };

  const toggleVisibility = () => {
    setVisible((prevVisible) => !prevVisible);
  };

  // ใช้ useMemo เพื่อป้องกันการสร้างฟังก์ชันใหม่ในทุกๆ การเรนเดอร์
  const value = useMemo(
    () => ({
      notifications,
      addNotification,
      visible,
      toggleVisibility,
      setNotifications,
    }),
    [notifications, visible]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};