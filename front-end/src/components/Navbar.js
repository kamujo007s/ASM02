import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, ConfigProvider, theme } from 'antd';
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
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#f5222d",
        colorInfo: "#a970f9",
        colorSuccess: "#a970f9"
      },
    }}
  >
      <Menu
        mode="horizontal"
        theme="dark"
        style={{ backgroundColor: '#8025ffe6' }}
        selectable={false}
      >
        <Menu.Item key="home" icon={<HomeOutlined />}>
          <Link to="/">Home</Link>
        </Menu.Item>
        <Menu.Item key="upload" icon={<UploadOutlined />}>
          <Link to="/upload">Upload Asset</Link>
        </Menu.Item>
        <Menu.Item key="add-manual" icon={<PlusOutlined />}>
          <Link to="/add-manual">Add Asset Manually</Link>
        </Menu.Item>
        <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
          <Link to="/risk-dashboard">Dashboard</Link>
        </Menu.Item>
        {/* <Menu.Item key="assets" icon={<DatabaseOutlined />}>
          <Link to="/assets">Assets</Link>
        </Menu.Item> */}
      </Menu>
    </ConfigProvider>
  );
};

export default Navbar;
