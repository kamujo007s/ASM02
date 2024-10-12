import React, { useEffect, useContext, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import VulnerabilityTable from './components/VulnerabilityTable';
import Navbar from './components/Navbar';
import VulnerabilityDashboard from './components/VulnerabilityDashboard';
import ManageAssets from './components/ManageAssets';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider, NotificationContext } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import NotificationBox from './components/NotificationBox';

const AppContent = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login' && location.pathname !== '/register';
  const { addNotification, setNotifications } = useContext(NotificationContext);
  const wsRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3012/cve/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setNotifications(data); // Sync notifications with database
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications(); // Fetch notifications when page loads

    // เชื่อมต่อ WebSocket ครั้งเดียวเมื่อ component ถูก mount
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`ws://localhost:3012/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.onmessage = (event) => {
      const notification = event.data;
      addNotification(notification); // Add new notification
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup connection เมื่อ component ถูก unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addNotification, setNotifications]); // เพิ่ม dependency เฉพาะที่จำเป็น

  return (
    <>
      {showNavbar && <Navbar />}
      <div className="container mt-5">
        <NotificationBox />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<VulnerabilityTable />} />
            <Route path="/vulnerabilities" element={<VulnerabilityTable />} />
            <Route path="/risk-dashboard" element={<VulnerabilityDashboard />} />
            <Route path="/manage-assets" element={<ManageAssets />} />
          </Route>
        </Routes>
      </div>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: '#fa8c16',
              colorInfo: '#fa8c16',
              colorSuccess: '#52c41a',
            },
          }}
        >
          <Router>
            <AppContent />
          </Router>
        </ConfigProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
