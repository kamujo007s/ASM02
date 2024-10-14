// CVEDetailsTable.js
import React from 'react';
import { Table } from 'antd';

const CVEDetailsTable = ({ cveDetailsData = []}) => {
  const columns = [
    { title: 'CVE ID', dataIndex: 'cveId', key: 'cveId' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Published Date', dataIndex: 'published', key: 'published' },
    { title: 'Last Modified', dataIndex: 'lastModified', key: 'lastModified' },
    { title: 'CVSS Score', dataIndex: 'cvssScore', key: 'cvssScore' }
  ];

  const dataSource = cveDetailsData.map((item, index) => ({
    ...item,
    key: item.cveId || index, // กำหนด key ไม่ซ้ำกัน
    description: item.descriptions?.[0]?.value || 'No description available', // แก้ไขเพื่อให้แสดงคำอธิบาย
  }));

  return <Table columns={columns} dataSource={dataSource} pagination={{ pageSize: 10 }} />;
};

export default CVEDetailsTable;

