// Navbar.js
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ConfigProvider, Badge, Button, message } from 'antd';
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
import axios from 'axios';

const Navbar = () => {
  const { auth, setAuth, csrfToken } = useContext(AuthContext); // เพิ่ม csrfToken
  const { notifications, toggleVisibility } = useContext(NotificationContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(
        'http://localhost:3012/api/auth/logout',
        {},
        {
          headers: {
            'X-CSRF-Token': csrfToken, // ส่ง CSRF Token ใน header
          },
          withCredentials: true,
        }
      );
      setAuth({ isAuthenticated: false, user: null, loading: false });
      message.success('ออกจากระบบสำเร็จ');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      message.error('ออกจากระบบไม่สำเร็จ');
    }
  };

  const isLoggedIn = auth.isAuthenticated;

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
    isLoggedIn && {
      key: 'manage-assets',
      icon: <DatabaseOutlined style={{ fontSize: '20px' }} />,
      label: <Link to="/manage-assets" style={{ color: '#000000' }}>Manage Assets</Link>,
    },
    isLoggedIn && {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '20px' }} />,
      label: <Link to="/risk-dashboard" style={{ color: '#000000' }}>Dashboard</Link>,
    },
    isLoggedIn && {
      key: 'notifications',
      icon: <BellOutlined style={{ fontSize: '20px' }} />,
      label: (
        <span onClick={toggleVisibility} style={{ color: '#000000', cursor: 'pointer' }}>
          Notifications <Badge count={notifications.length} offset={[5, -15]} />
        </span>
      ),
    },
    isLoggedIn ? {
      key: 'logout',
      icon: <LogoutOutlined style={{ fontSize: '20px' }} />,
      label: <span onClick={handleLogout} style={{ color: '#000000', cursor: 'pointer' }}>Logout</span>,
    } : {
      key: 'login',
      icon: <HomeOutlined style={{ fontSize: '20px' }} />,
      label: <Link to="/login" style={{ color: '#000000' }}>Login</Link>,
    },
  ].filter(item => item); // ลบเมนูที่เป็น `false` ออก

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