// VulnerabilitiesByAssetTable.js
import React from 'react';
import { Table } from 'antd';

const VulnerabilitiesByAssetTable = ({ assetVulnerabilityData }) => {
  const columns = [
    { title: 'Asset Name', dataIndex: 'asset_name', key: 'asset_name' },
    { title: 'CVE ID', dataIndex: 'cveId', key: 'cveId' },
    { title: 'CVSS Score', dataIndex: 'cvssScore', key: 'cvssScore' },
    { title: 'Risk Level', dataIndex: 'riskLevel', key: 'riskLevel' }
  ];

  const dataSource = assetVulnerabilityData.map((item, index) => ({
    ...item,
    key: item.cveId || index, // กำหนด key โดยใช้ cveId หรือ index
  }));

  return <Table columns={columns} dataSource={dataSource} pagination={{ pageSize: 10 }} />;
};

export default VulnerabilitiesByAssetTable;
