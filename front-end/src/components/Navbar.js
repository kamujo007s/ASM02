// Navbar.js
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
import Logo from '../pic/ASM CVE-2.png'; // ปรับเส้นทางตามความเหมาะสม

const Navbar = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const { notifications, toggleVisibility } = useContext(NotificationContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({ token: null });
    navigate('/login');
    window.location.reload();
  };

  const isLoggedIn = auth && auth.token;

  // รวมโลโก้และเมนูเข้าไปใน items
  const menuItems = [
    {
      key: 'home',
      label: (
        <Link to="/">
          <img src={Logo} alt="Logo" style={{ height: '40px', width: '100%' }} />
        </Link>
      ),
      style: { marginRight: 'auto' },
    },
    {
      key: 'manage-assets',
      icon: <DatabaseOutlined style={{ fontSize: '20px' }} />,
      label: <Link to="/manage-assets" style={{ color: '#000000' }}>Manage Assets</Link>,
    },
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '20px' }} />,
      label: <Link to="/risk-dashboard" style={{ color: '#000000' }}>Dashboard</Link>,
    },
    {
      key: 'notifications',
      icon: <BellOutlined style={{ fontSize: '20px' }} />,
      label: (
        <span onClick={toggleVisibility} style={{ color: '#000000' }}>
          Notifications <Badge count={notifications.length} offset={[5, -15]} />
        </span>
      ),
    },
    isLoggedIn ? {
      key: 'logout',
      icon: <LogoutOutlined style={{ fontSize: '20px' }} />,
      label: <span onClick={handleLogout} style={{ color: '#000000' }}>Logout</span>,
    } : {
      key: 'login',
      icon: <HomeOutlined style={{ fontSize: '20px' }} />,
      label: <Link to="/login" style={{ color: '#000000' }}>Login</Link>,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          colorInfo: "#1677ff",
          colorTextBase: "#000000",
          colorBgBase: "#ffffff",
          borderRadius: 6,
          wireframe: false,
        },
      }}
    >
      <div style={{ borderBottom: '1px solid #e8e8e8', marginBottom: '0px', padding: '0 20px' }}>
        <Menu
          mode="horizontal"
          theme="light"
          style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center' }}
          selectable={false}
          items={menuItems} // ใช้ items แทน children
        />
      </div>
    </ConfigProvider>
  );
};

export default Navbar;
