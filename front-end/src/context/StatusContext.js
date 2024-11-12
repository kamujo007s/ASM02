// context/StatusContext.js
import React, { createContext, useState, useEffect, useRef } from 'react';

export const StatusContext = createContext();

export const StatusProvider = ({ children }) => {
  const [statuses, setStatuses] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3012/');

    ws.onopen = () => {
      console.log('WebSocket connected');
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setStatuses((prevStatuses) => [...prevStatuses, data.status]);
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

  return (
    <StatusContext.Provider value={{ statuses }}>
      {children}
    </StatusContext.Provider>
  );
};