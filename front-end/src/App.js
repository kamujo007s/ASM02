import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import VulnerabilityTable from './components/VulnerabilityTable';
import UploadAsset from './components/UploadAsset';
import AddAssetManual from './components/AddAssetManual';
import Navbar from './components/Navbar'; // อย่าลืมสร้างและ import Navbar

function App() {
  return (
    <Router>
      <Navbar /> {/* เพิ่ม Navbar เพื่อเชื่อมต่อหน้าทั้งหมด */}
      <div className="container mt-5">
        <h1 className="mb-4">Vulnerability CVE Mapping</h1>
        <Routes>
          <Route path="/" element={<VulnerabilityTable />} />
          <Route path="/vulnerabilities" element={<VulnerabilityTable />} />
          <Route path="/upload" element={<UploadAsset />} /> {/* Route สำหรับอัปโหลดไฟล์ */}
          <Route path="/add-manual" element={<AddAssetManual />} /> {/* Route สำหรับการเพิ่มแบบแมนนวล */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
