import React, { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { List, Typography, Drawer } from 'antd';

const { Title } = Typography;

const NotificationBox = () => {
  const { notifications, visible, toggleVisibility } = useContext(NotificationContext);

  return (
    <Drawer
      title="Notifications"
      placement="right"
      onClose={toggleVisibility}
      open={visible} // เปลี่ยนจาก visible เป็น open
    >
      <List
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item>
            <Typography.Text>{item}</Typography.Text>
          </List.Item>
        )}
      />
    </Drawer>
  );
};

export default NotificationBox;