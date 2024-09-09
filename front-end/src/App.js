import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';  // เพิ่ม JavaScript เพื่อรองรับการทำงานของ Toggler
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import VulnerabilityTable from './components/VulnerabilityTable';
import UploadAsset from './components/UploadAsset';
import AddAssetManual from './components/AddAssetManual';
import Navbar from './components/Navbar'; // อย่าลืมสร้างและ import Navbar
import VulnerabilityDashboard from './components/VulnerabilityDashboard'; // อย่าลืมสร้างและ import RiskDashboard
import Chatbot from './components/Chatbot';

function App() {
  return (
    <Router>
      <Navbar /> {/* เพิ่ม Navbar เพื่อเชื่อมต่อหน้าทั้งหมด */}
      <div className="container mt-5">
        <Routes>
          <Route path="/" element={<VulnerabilityTable />} />
          <Route path="/vulnerabilities" element={<VulnerabilityTable />} />
          <Route path="/upload" element={<UploadAsset />} /> {/* Route สำหรับอัปโหลดไฟล์ */}
          <Route path="/add-manual" element={<AddAssetManual />} /> {/* Route สำหรับการเพิ่มแบบแมนนวล */}
          <Route path="/risk-dashboard" element={<VulnerabilityDashboard />} /> {/* Route สำหรับ Dashboard ของความเสี่ยง */}
          <Route path="/chatbot" element={<Chatbot />} /> {/* Route สำหรับ Chatbot */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
