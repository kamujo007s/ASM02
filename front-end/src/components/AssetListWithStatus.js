// AssetListWithStatus.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const AssetListWithStatus = () => {
  const [assets, setAssets] = useState([]);
  const [cveMatches, setCveMatches] = useState([]); // เก็บข้อมูล CVE ที่ตรงกัน
  const [selectedAsset, setSelectedAsset] = useState(null); // เก็บ asset ที่ถูกเลือก

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

  const fetchCveMatches = async (operating_system, os_version) => {
    try {
      const response = await axios.get('/cve-matches', { params: { operating_system, os_version } });
      setCveMatches(response.data); // เก็บข้อมูล CVE ที่ดึงมา
    } catch (error) {
      console.error('Error fetching CVE matches:', error);
      setCveMatches([]); // ถ้ามี error ให้ล้างข้อมูล CVE
    }
  };

  const handleTrueClick = (asset) => {
    setSelectedAsset(asset);
    fetchCveMatches(asset.operating_system, asset.os_version);
  };

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
                  <button 
                    className="btn btn-success" 
                    onClick={() => handleTrueClick(asset)}>
                    True
                  </button>
                ) : (
                  <span className="badge bg-danger">{asset.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* แสดงรายการ CVE เมื่อ asset ถูกเลือก */}
      {selectedAsset && Array.isArray(cveMatches) && cveMatches.length > 0 && (
        <div className="mt-5">
          <h2>CVEs for {selectedAsset.operating_system} {selectedAsset.os_version}</h2>
          <ul className="list-group">
            {cveMatches.map((cve) => (
              <li key={cve.id} className="list-group-item">
                <strong>CVE ID:</strong> {cve.id} <br />
                <strong>Criteria:</strong> {Array.isArray(cve.criteria) ? cve.criteria.map(c => c.criteria).join(', ') : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedAsset && Array.isArray(cveMatches) && cveMatches.length === 0 && (
        <div className="mt-5">
          <p>No CVEs found for {selectedAsset.operating_system} {selectedAsset.os_version}</p>
        </div>
      )}
    </div>
  );
};

export default AssetListWithStatus;
