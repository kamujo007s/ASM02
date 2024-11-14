// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import VulnerabilityTable from './components/VulnerabilityTable';
import Navbar from './components/Navbar';
import VulnerabilityDashboard from './components/VulnerabilityDashboard2';
import ManageAssets from './components/ManageAssets';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { StatusProvider } from './context/StatusContext'; // เพิ่มการนำเข้า StatusProvider
import PrivateRoute from './components/PrivateRoute';
import NotificationBox from './components/NotificationBox';
import VulnerabilityDetail from "./components/VulnerabilityDetail";

const AppContent = () => (
  <>
    <Navbar />
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

function App() {
  return (
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
      <NotificationProvider>
        <AuthProvider>
          <StatusProvider> {/* ห่อด้วย StatusProvider */}
            <Router>
              <AppContent />
            </Router>
          </StatusProvider>
        </AuthProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}

export default App;