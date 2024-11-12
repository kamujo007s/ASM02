//Top5OSCurrentYearTable.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table } from 'antd';

const Top5OSCurrentYearTable = () => {
  const [top5OS, setTop5OS] = useState([]);
  const currentYear = new Date().getFullYear(); // Get the current year

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3012/cve/top-5-os-current-year', {
          withCredentials: true,
        });

        setTop5OS(response.data);
      } catch (error) {
        console.error('Error fetching top 5 OS:', error);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      title: 'Operating System',
      dataIndex: '_id',
      key: 'os',
    },
    {
      title: 'Vulnerabilities',
      dataIndex: 'totalVulns',
      key: 'vulns',
    },
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={top5OS} 
      rowKey="_id" 
      pagination={false} 
      bordered 
      title={() => `Top 5 OS Table by Vulnerabilities ${currentYear}`} // Include the current year in the title
    />
  );
};

export default Top5OSCurrentYearTable;