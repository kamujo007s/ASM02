import React, { createContext, useState, useMemo, useEffect, useRef } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3012/');

    ws.onopen = () => {
      console.log('WebSocket connected');
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications((prevNotifications) => {
          // ตรวจสอบว่าการแจ้งเตือนนี้มีอยู่แล้วหรือไม่
          if (!prevNotifications.some(notification => notification.message === data.message)) {
            return [...prevNotifications, data];
          }
          return prevNotifications;
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications((prevNotifications) => {
      // ตรวจสอบว่าการแจ้งเตือนนี้มีอยู่แล้วหรือไม่
      if (!prevNotifications.some(notif => notif.message === notification.message)) {
        return [...prevNotifications, notification];
      }
      return prevNotifications;
    });
  };

  const toggleVisibility = () => {
    setVisible((prevVisible) => !prevVisible);
  };

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