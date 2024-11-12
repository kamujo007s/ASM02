// NotificationBox.js
import React, { useContext, useEffect } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { List, Typography, Drawer } from 'antd';
import moment from 'moment';
import axios from 'axios';

const NotificationBox = () => {
  const { notifications, visible, toggleVisibility, setNotifications } = useContext(NotificationContext);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('http://localhost:3012/cve/notifications', {
          withCredentials: true,
        });
        setNotifications(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [setNotifications]);

  return (
    <Drawer
      title="Notifications"
      placement="right"
      onClose={toggleVisibility}
      open={visible}
    >
      <List
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text>{item.message}</Typography.Text>
              <Typography.Text type="secondary">
                {moment(item.createdAt).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
            </div>
          </List.Item>
        )}
      />
    </Drawer>
  );
};

export default NotificationBox;