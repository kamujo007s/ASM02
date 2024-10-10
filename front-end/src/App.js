import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import VulnerabilityTable from './components/VulnerabilityTable';
import Navbar from './components/Navbar'; 
import VulnerabilityDashboard from './components/VulnerabilityDashboard';
import AssetListWithStatus from './components/AssetListWithStatus';
import ManageAssets from './components/ManageAssets';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import NotificationBox from './components/NotificationBox';
import useSocket from './websocket'; // นำเข้า hook

const AppContent = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login' && location.pathname !== '/register';

  useSocket('http://localhost:3012'); // ใช้ hook

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