import React, { useEffect, useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { Button, message, App } from 'antd';
import axios from 'axios';

const NotificationTest = () => {
  const { addNotification } = useContext(NotificationContext);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3012'); // เปลี่ยน URL ให้ตรงกับ WebSocket server ของคุณ

    ws.onmessage = (event) => {
      const notification = event.data;
      addNotification(notification);
      message.info(notification);
    };

    return () => {
      ws.close();
    };
  }, [addNotification]);

  const handleMockAddCve = async () => {
    try {
      await axios.post('http://localhost:3012/cve/mock-add-cve');
      message.success('Mock CVE added');
    } catch (error) {
      message.error('Error adding mock CVE');
    }
  };

  return (
    <App>
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Button type="primary" onClick={handleMockAddCve}>
          Add Mock CVE
        </Button>
      </div>
    </App>
  );
};

export default NotificationTest;