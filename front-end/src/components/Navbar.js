import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, ConfigProvider,} from 'antd';
import {
  HomeOutlined,
  UploadOutlined,
  PlusOutlined,
  DashboardOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';

const Navbar = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          colorInfo: "#1677ff",
          colorTextBase: "#ffffff", // เปลี่ยนเป็นสีขาวให้เข้ากับธีมมืด
          colorBgBase: "#1f1f1f",   // เปลี่ยนพื้นหลังเป็นสีเข้ม
          borderRadius: 6,
          wireframe: false,
        },
      }}
    >
      <Menu
        mode="horizontal"
        theme="dark"
        style={{ backgroundColor: '#2e2e2e' }} // ปรับพื้นหลังของเมนูให้เข้ากับธีมมืด
        selectable={false}
      >
        <Menu.Item key="home" icon={<HomeOutlined />}>
          <Link to="/" style={{ color: '#ffffff' }}>Home</Link> {/* ใช้สีขาวสำหรับข้อความ */}
        </Menu.Item>
        {/* <Menu.Item key="upload" icon={<UploadOutlined />}>
          <Link to="/upload" style={{ color: '#ffffff' }}>Upload Asset</Link>
        </Menu.Item>
        <Menu.Item key="add-manual" icon={<PlusOutlined />}>
          <Link to="/add-manual" style={{ color: '#ffffff' }}>Add Asset Manually</Link>
        </Menu.Item> */}
        <Menu.Item key="manage-assets" icon={<DatabaseOutlined />}>
          <Link to="/manage-assets" style={{ color: '#ffffff' }}>Manage Assets</Link>
        </Menu.Item>
        <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
          <Link to="/risk-dashboard" style={{ color: '#ffffff' }}>Dashboard</Link>
        </Menu.Item>
      </Menu>
    </ConfigProvider>
  );
};

export default Navbar;