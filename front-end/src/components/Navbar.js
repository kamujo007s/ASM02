import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ConfigProvider, Badge } from 'antd';
import {
  HomeOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';

const Navbar = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const { notifications, toggleVisibility } = useContext(NotificationContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({ token: null });
    navigate('/login');
  };

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: <Link to="/" style={{ color: '#ffffff' }}>Home</Link>,
    },
    {
      key: 'manage-assets',
      icon: <DatabaseOutlined />,
      label: <Link to="/manage-assets" style={{ color: '#ffffff' }}>Manage Assets</Link>,
    },
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/risk-dashboard" style={{ color: '#ffffff' }}>Dashboard</Link>,
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: (
        <Badge count={notifications.length} offset={[10, 0]}>
          <span onClick={toggleVisibility} style={{ color: '#ffffff' }}>Notifications</span>
        </Badge>
      ),
    },
    auth.token ? {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span onClick={handleLogout} style={{ color: '#ffffff' }}>Logout</span>,
    } : {
      key: 'login',
      icon: <HomeOutlined />,
      label: <Link to="/login" style={{ color: '#ffffff' }}>Login</Link>,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          colorInfo: "#1677ff",
          colorTextBase: "#ffffff",
          colorBgBase: "#1f1f1f",
          borderRadius: 6,
          wireframe: false,
        },
      }}
    >
      <Menu
        mode="horizontal"
        theme="dark"
        style={{ backgroundColor: '#2e2e2e' }}
        items={menuItems}
        selectable={false}
      />
    </ConfigProvider>
  );
};

export default Navbar;