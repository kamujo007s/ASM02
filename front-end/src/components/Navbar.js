import React, { useContext, useRef } from 'react';
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
import Logo from '../pic/ASM CVE-2.png'; // Adjust the path as necessary

const Navbar = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const { notifications, toggleVisibility } = useContext(NotificationContext);
  const navigate = useNavigate();
  
  // ใช้ useRef แทนการใช้ findDOMNode
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({ token: null });
    navigate('/login');
    window.location.reload();
  };

  const menuItems = [
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
      <div style={{ borderBottom: '1px solid #e8e8e8', marginBottom: '0px', padding: '0 20px' }}>
        <Menu
          ref={menuRef} // ใช้ ref กับ Menu
          mode="horizontal"
          theme="light"
          style={{ backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          selectable={false}
        >
          {/* โลโก้ทางซ้าย */}
          <Menu.Item key="home" style={{ marginRight: 'auto' }}>
            <Link to="/">
              <img src={Logo} alt="Logo" style={{height: '40px' , width:'100%'}} />
            </Link>
          </Menu.Item>

          {/* เมนูทางขวา */}
          <div style={{ display: 'flex' }}>
            {menuItems.map(item => (
              <Menu.Item key={item.key} icon={item.icon}>
                {item.label}
              </Menu.Item>
            ))}
          </div>
        </Menu>
      </div>
    </ConfigProvider>
  );
};

export default Navbar;
