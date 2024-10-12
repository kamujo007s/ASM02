// NotificationBox.js
import React, { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { List, Typography, Drawer } from 'antd';
import moment from 'moment';

const { Title } = Typography;

const NotificationBox = () => {
  const { notifications, visible, toggleVisibility } = useContext(NotificationContext);

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
            <Typography.Text>{item.message}</Typography.Text>
            <Typography.Text >{moment(item.createdAt).format('YYYY-MM-DD  HH:mm')}</Typography.Text>
          </List.Item>
        )}
      />
    </Drawer>
  );
};

export default NotificationBox;
