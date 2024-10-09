import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd'; // นำเข้า ConfigProvider สำหรับจัดการธีม
import VulnerabilityTable from './components/VulnerabilityTable';
// import UploadAsset from './components/UploadAsset';
// import AddAssetManual from './components/AddAssetManual';
import Navbar from './components/Navbar'; 
import VulnerabilityDashboard from './components/VulnerabilityDashboard';
import AssetListWithStatus from './components/AssetListWithStatus';
import ManageAssets from './components/ManageAssets';
import Login from './components/Login'; // เพิ่มการนำเข้า Login
import Register from './components/Register'; // เพิ่มการนำเข้า Register
import { AuthProvider } from './context/AuthContext'; // เพิ่มการนำเข้า AuthProvider
import { NotificationProvider } from './context/NotificationContext'; // เพิ่มการนำเข้า NotificationProvider
import PrivateRoute from './components/PrivateRoute'; // เพิ่มการนำเข้า PrivateRoute
import NotificationBox from './components/NotificationBox'; // เพิ่มการนำเข้า NotificationBox
import NotificationTest from './components/NotificationTest'; // เพิ่มการนำเข้า NotificationTest

const AppContent = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login' && location.pathname !== '/register';

  return (
    <>
      {showNavbar && <Navbar />} {/* แสดง Navbar เฉพาะเมื่อเส้นทางไม่ใช่ /login หรือ /register */}
      <div className="container mt-5">
        <NotificationBox /> {/* เพิ่ม NotificationBox */}
        <Routes>
          <Route path="/login" element={<Login />} /> {/* Route สำหรับหน้า Login */}
          <Route path="/register" element={<Register />} /> {/* Route สำหรับหน้า Register */}
          <Route path="/notification-test" element={<NotificationTest />} /> {/* Route สำหรับหน้า NotificationTest */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<VulnerabilityTable />} />
            <Route path="/vulnerabilities" element={<VulnerabilityTable />} /> {/* Route สำหรับ VulnerabilityTable */}
            {/* <Route path="/upload" element={<UploadAsset />} /> {/* Route สำหรับอัปโหลดไฟล์ */}
            {/* <Route path="/add-manual" element={<AddAssetManual />} /> Route สำหรับการเพิ่มแบบแมนนวล */}
            <Route path="/risk-dashboard" element={<VulnerabilityDashboard />} /> {/* Route สำหรับ Dashboard ของความเสี่ยง */}
            <Route path="/assets" element={<AssetListWithStatus />} /> {/* Route สำหรับแสดงรายการของ Asset */}
            <Route path="/manage-assets" element={<ManageAssets />} /> {/* Route สำหรับการจัดการ Asset */}
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
            algorithm: theme.darkAlgorithm, // ใช้ Dark Theme
            token: {
              colorPrimary: "#fa8c16",  // สีหลักจาก theme.json
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