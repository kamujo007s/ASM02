import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AssetListWithCriteria = () => {
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
      <h1 className="mb-4">Asset List with Criteria</h1>
      <table className="table table-striped table-bordered">
        <thead className="thead-dark">
          <tr>
            <th>Device Name</th>
            <th>Operating System</th>
            <th>OS Version</th>
            <th>Status</th>
            <th>Criteria (From CVE)</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset._id}>
              <td>{asset.device_name}</td>
              <td>{asset.operating_system}</td>
              <td>{asset.os_version}</td>
              <td>
                {asset.status === 'True' ? (
                  <span className="badge bg-success">{asset.status}</span>
                ) : (
                  <span className="badge bg-danger">{asset.status}</span>
                )}
              </td>
              <td>
                <ul>
                  {asset.criteriaList?.map((criteria, index) => (
                    <li key={index}>{criteria}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetListWithCriteria;
