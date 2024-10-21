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
  const { auth, setAuth } = useContext(AuthContext);
  const showNavbar = location.pathname !== '/login' && location.pathname !== '/register';
  const { addNotification, setNotifications } = useContext(NotificationContext);
  const wsRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isWebSocketOpen, setIsWebSocketOpen] = useState(false);

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
    }
  }, [auth.token, navigate]);

  useEffect(() => {
    let intervalId;

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
            clearInterval(intervalId);
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

    // แก้ไขเวลาให้เป็น 30 วินาที (30000 มิลลิวินาที)
    intervalId = setInterval(fetchNotifications, 30000);

    const connectWebSocket = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token is missing. Cannot establish WebSocket connection.');
        return;
      }

      const ws = new WebSocket(`ws://192.168.142.180:3012/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWebSocketOpen(true);
        setRetryCount(0);
      };

      ws.onmessage = (event) => {
        const notification = event.data;
        addNotification(notification);
      };

      ws.onclose = (event) => {
        setIsWebSocketOpen(false);
        if (!event.wasClean && retryCount < 5) {
          setTimeout(() => {
            setRetryCount((prevCount) => prevCount + 1);
            connectWebSocket();
          }, 5000); // แก้ไขเวลาให้เป็น 5 วินาที (5000 มิลลิวินาที)
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
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      clearInterval(intervalId);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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