// UnpatchedVulnerabilitiesTable.js
import React from 'react';
import { Table } from 'antd';

const UnpatchedVulnerabilitiesTable = ({ unpatchedData = [] }) => {
  const unpatched = unpatchedData.map((vuln, index) => ({
    key: index,
    cveId: vuln.cveId ?? 'Unknown',
    operating_system: vuln.operating_system ?? 'Unknown',
    os_version: vuln.os_version ?? 'Unknown',
    vulnStatus: vuln.vulnStatus ?? 'Unknown',
  }));

  const columns = [
    { title: 'CVE ID', dataIndex: 'cveId', key: 'cveId' },
    { title: 'Operating System', dataIndex: 'operating_system', key: 'operating_system' },
    { title: 'Version', dataIndex: 'os_version', key: 'os_version' },
    { title: 'Status', dataIndex: 'vulnStatus', key: 'vulnStatus' },
  ];

  return <Table columns={columns} dataSource={unpatched} pagination={{ pageSize: 10 }} />;
};

export default UnpatchedVulnerabilitiesTable;
