import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, message } from 'antd';
import VulnerabilityTable from './components/VulnerabilityTable';
import Navbar from './components/Navbar'; 
import VulnerabilityDashboard from './components/VulnerabilityDashboard';
import AssetListWithStatus from './components/AssetListWithStatus';
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
  const { addNotification } = useContext(NotificationContext);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3012'); // เปลี่ยน URL ให้ตรงกับ WebSocket server ของคุณ

    ws.onmessage = (event) => {
      const notification = event.data;
      addNotification(notification);
      message.info(notification);
    };

    return () => {
      ws.close();
    };
  }, [addNotification]);

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
            <Route path="/assets" element={<AssetListWithStatus />} />
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
              colorPrimary: "#fa8c16",
              colorInfo: "#fa8c16",
              colorSuccess: "#52c41a",
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