// src/websocket.js
import { message } from 'antd';
import { NotificationContext } from './context/NotificationContext';
import React, { useContext, useEffect } from 'react';
import { io } from 'socket.io-client';

const useSocket = (url) => {
  const { addNotification } = useContext(NotificationContext);

  useEffect(() => {
    const socket = io(url);

    socket.on('connect', () => {
      console.log('Socket.io connection established');
    });

    socket.on('notification', (notification) => {
      addNotification(notification);
      message.info(notification);
    });

    socket.on('disconnect', () => {
      console.log('Socket.io connection closed');
    });

    return () => {
      socket.disconnect();
    };
  }, [url, addNotification]);
};

export default useSocket;