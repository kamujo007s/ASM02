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
import Logo from '../pic/Logo.jpg'; // ปรับเส้นทางตามความเหมาะสม

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

  // เปลี่ยนชื่อ `key` เป็น `itemKey`
  const menuItems = [
    {
      key: 'home',
      label: (
        <Link to="/">
          <img src={Logo} alt="Logo" style={{ width: '40px', height: '40px' }} />
        </Link>
      ),
      style: { marginRight: 'auto' , padding:' 10px 0 0 0'}, // จัดให้อยู่ซ้ายมือ
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
    auth.token ? {
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
      <div style={{ borderBottom: '1px solid #e8e8e8', marginBottom: '10px', padding: '0 20px' }}>
        {/* ใช้ prop `items` ของ Menu */}
        <Menu
          mode="horizontal"
          theme="light"
          style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center' }}
          selectable={false}
          items={menuItems}
        />
      </div>
    </ConfigProvider>
  );
};

export default Navbar;
