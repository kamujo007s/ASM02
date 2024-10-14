// UnpatchedVulnerabilitiesTable.js
import React from 'react';
import { Table } from 'antd';

const UnpatchedVulnerabilitiesTable = ({ unpatchedData }) => {
  const columns = [
    { title: 'Operating System', dataIndex: 'operating_system', key: 'operating_system' },
    { title: 'Version', dataIndex: 'os_version', key: 'os_version' },
    { title: 'Unpatched Count', dataIndex: 'unpatched', key: 'unpatched' }
  ];

  return <Table columns={columns} dataSource={unpatchedData} pagination={{ pageSize: 10 }} />;
};

export default UnpatchedVulnerabilitiesTable;
