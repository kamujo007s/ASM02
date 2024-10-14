//UnpatchedProductsTable.js
import React from 'react';
import { Table } from 'antd';

const UnpatchedProductsTable = ({ productsData }) => {
  const columns = [
    {
      title: 'Operating System',
      dataIndex: 'operating_system',
      key: 'operating_system',
    },
    {
      title: 'Version',
      dataIndex: 'os_version',
      key: 'os_version',
    },
    {
      title: 'Unpatched Products',
      dataIndex: 'unpatched',
      key: 'unpatched',
    },
  ];

  const data = productsData.map((product, index) => ({
    key: index,
    operating_system: product.operating_system,
    os_version: product.os_version,
    unpatched: product.unpatched,
  }));

  return <Table columns={columns} dataSource={data} pagination={{ pageSize: 10 }} />;
};

export default UnpatchedProductsTable;
