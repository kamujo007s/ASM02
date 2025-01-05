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
        setStatuses((prevStatuses) => {
          if (!prevStatuses.includes(data.status)) {
            return [...prevStatuses, data.status];
          }
          return prevStatuses;
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

  return (
    <StatusContext.Provider value={{ statuses }}>
      {children}
    </StatusContext.Provider>
  );
};