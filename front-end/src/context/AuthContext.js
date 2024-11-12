// context/AuthContext.js
import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({ isAuthenticated: false, user: null, loading: true });
  const [csrfToken, setCsrfToken] = useState('');
  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ดึง CSRF Token
        const csrfResponse = await axios.get('http://localhost:3012/api/csrf-token', {
          withCredentials: true,
        });
        setCsrfToken(csrfResponse.data.csrfToken);

        // ตรวจสอบสถานะการยืนยันตัวตน
        const response = await axios.get('http://localhost:3012/api/auth/me', {
          withCredentials: true,
        });
        if (response.status === 200) {
          setAuth({ isAuthenticated: true, user: response.data.user, loading: false });
        } else {
          setAuth({ isAuthenticated: false, user: null, loading: false });
        }
      } catch (error) {
        setAuth({ isAuthenticated: false, user: null, loading: false });
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    console.log('Auth state changed:', auth);
    if (auth.isAuthenticated) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  const connectWebSocket = () => {
    if (wsRef.current) return; // ถ้ามี WebSocket อยู่แล้ว ไม่ต้องสร้างใหม่

    const ws = new WebSocket('ws://localhost:3012/'); // ปรับ URL ตามที่จำเป็น

    ws.onopen = () => {
      console.log('WebSocket connected');
      wsRef.current = ws;
      retryCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'error') {
          ws.close();
          return;
        }

        // จัดการข้อความอื่น ๆ ที่ได้รับจาก Server
        console.log('Received data:', data);
        // ตัวอย่าง: addNotification(data);
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected');
      message.warning('WebSocket disconnected');
      wsRef.current = null;
      if (!event.wasClean && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        const timeout = Math.min(10000, 5000 * retryCountRef.current);
        setTimeout(() => {
          connectWebSocket();
        }, timeout);
      } else if (retryCountRef.current >= maxRetries) {
        message.error('Unable to reconnect to WebSocket.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      retryCountRef.current = 0;
    }
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, csrfToken }}>
      {children}
    </AuthContext.Provider>
  );
};