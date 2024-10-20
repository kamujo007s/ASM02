// ImpactScoreTable.js
import React from 'react';
import { Table } from 'antd';

const ImpactScoreTable = ({ impactData = [] }) => {
  // Prepare table data
  const tableData = impactData.map((vuln, index) => ({
    key: index,
    cveId: vuln.id,
    confidentialityImpact: vuln.confidentialityImpact || 'N/A',
    integrityImpact: vuln.integrityImpact || 'N/A',
    availabilityImpact: vuln.availabilityImpact || 'N/A',
    cvssScore: vuln.cvssScore || 'N/A',
  }));

  // Define table columns
  const columns = [
    {
      title: 'CVE ID',
      dataIndex: 'cveId',
      key: 'cveId',
    },
    {
      title: 'Confidentiality Impact',
      dataIndex: 'confidentialityImpact',
      key: 'confidentialityImpact',
    },
    {
      title: 'Integrity Impact',
      dataIndex: 'integrityImpact',
      key: 'integrityImpact',
    },
    {
      title: 'Availability Impact',
      dataIndex: 'availabilityImpact',
      key: 'availabilityImpact',
    },
    {
      title: 'CVSS Score',
      dataIndex: 'cvssScore',
      key: 'cvssScore',
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={tableData}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ImpactScoreTable;
