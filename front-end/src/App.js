// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd'; // นำเข้า ConfigProvider สำหรับจัดการธีม
import VulnerabilityTable from './components/VulnerabilityTable';
// import UploadAsset from './components/UploadAsset';
// import AddAssetManual from './components/AddAssetManual';
import Navbar from './components/Navbar'; 
import VulnerabilityDashboard from './components/VulnerabilityDashboard';
import AssetListWithStatus from './components/AssetListWithStatus';
import ManageAssets from './components/ManageAssets';

function App() {
  return (
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
        <Navbar /> {/* Navbar สำหรับนำทาง */}
        <div className="container mt-5">
          <Routes>
            <Route path="/" element={<VulnerabilityTable />} />
            <Route path="/vulnerabilities" element={<VulnerabilityTable />} /> {/* Route สำหรับ VulnerabilityTable */}
            {/* <Route path="/upload" element={<UploadAsset />} /> {/* Route สำหรับอัปโหลดไฟล์ */}
            {/* <Route path="/add-manual" element={<AddAssetManual />} /> Route สำหรับการเพิ่มแบบแมนนวล */} */}
            <Route path="/risk-dashboard" element={<VulnerabilityDashboard />} /> {/* Route สำหรับ Dashboard ของความเสี่ยง */}
            <Route path="/assets" element={<AssetListWithStatus />} /> {/* Route สำหรับแสดงรายการของ Asset */}
            <Route path="/manage-assets" element={<ManageAssets />} /> {/* Route สำหรับการจัดการ Asset */}

          </Routes>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;
