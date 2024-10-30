import React, { useEffect, useContext, useRef, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import VulnerabilityTable from './components/VulnerabilityTable';
import Navbar from './components/Navbar';
import VulnerabilityDashboard from './components/VulnerabilityDashboard2';
import ManageAssets from './components/ManageAssets';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { NotificationProvider, NotificationContext } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import NotificationBox from './components/NotificationBox';
import VulnerabilityDetail from "./components/VulnerabilityDetail";

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const showNavbar = location.pathname !== '/login' && location.pathname !== '/register';
  const { addNotification, setNotifications } = useContext(NotificationContext);
  const wsRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isWebSocketOpen, setIsWebSocketOpen] = useState(false);

  // ตรวจสอบการล็อกอิน
  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
    }
  }, [auth.token, navigate]);

  // ดึงข้อมูลการแจ้งเตือนทุก ๆ 30 วินาที
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn("No token available. Cannot fetch notifications.");
        return;
      }

      try {
        const response = await fetch('http://localhost:3012/cve/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 403) {
            console.error('Forbidden: Token is invalid or expired.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [auth.token, setNotifications]);

  // จัดการการเชื่อมต่อ WebSocket
  useEffect(() => {
    let ws;

    const connectWebSocket = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token is missing. Cannot establish WebSocket connection.');
        return;
      }

      ws = new WebSocket(`ws://192.168.142.180:3012/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWebSocketOpen(true);
        setRetryCount(0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addNotification(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = (event) => {
        setIsWebSocketOpen(false);
        if (!event.wasClean && retryCount < 5) {
          setRetryCount((prevCount) => prevCount + 1);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsWebSocketOpen(false);
      };
    };

    if (!isWebSocketOpen && retryCount < 5) {
      connectWebSocket();
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [auth.token, isWebSocketOpen, retryCount, addNotification]);

  // พยายามเชื่อมต่อใหม่เมื่อ WebSocket ปิด
  useEffect(() => {
    if (!isWebSocketOpen && retryCount > 0 && retryCount < 5) {
      const timer = setTimeout(() => {
        setRetryCount((prevCount) => prevCount - 1);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isWebSocketOpen, retryCount]);
  // Re-render on route change
  useEffect(() => {
    // This effect will run on every route change
  }, [location]);
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
            <Route path="/vulnerabilities/:id" element={<VulnerabilityDetail />} />
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
