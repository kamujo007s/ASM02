import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // เพิ่มการใช้งาน Link จาก react-router-dom
import 'bootstrap/dist/css/bootstrap.min.css'; // นำเข้า CSS ของ Bootstrap

const AssetListWithStatus = () => {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    // ดึงข้อมูลจาก API
    const fetchAssets = async () => {
      try {
        const response = await axios.get('/assetList/assets-with-status');
        setAssets(response.data); // เก็บข้อมูล asset ที่ดึงมาใน state
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    fetchAssets();
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Asset List</h1>
      <table className="table table-striped table-bordered">
        <thead className="thead-dark">
          <tr>
            <th>Device Name</th>
            <th>Application Name</th>
            <th>Operating System</th>
            <th>OS Version</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset._id}>
              <td>{asset.device_name}</td>
              <td>{asset.application_name}</td>
              <td>{asset.operating_system}</td>
              <td>{asset.os_version}</td>
              <td>
                {asset.status === 'True' ? (
                  // เมื่อกดที่ True จะไปที่ VulnerabilityTable พร้อมกับ OS ที่ถูกฟิลเตอร์ใน query parameters
                  <Link to={`/vulnerabilities?operating_system=${encodeURIComponent(asset.operating_system)}`}>
                    <span className="badge bg-success">{asset.status}</span>
                  </Link>
                ) : (
                  <span className="badge bg-danger">{asset.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetListWithStatus;
