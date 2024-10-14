// TopWeaknessesChart.js
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { ConfigProvider, theme } from 'antd';

const TopWeaknessesChart = ({ cweData }) => {
  const labels = cweData.map(item => item.cwe);
  const dataValues = cweData.map(item => item.count);

  const data = {
    labels,
    datasets: [{
      label: 'Top Weaknesses (CWE)',
      data: dataValues,
      backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56']
    }]
  };

  const options = {
    plugins: {
      legend: { position: 'bottom' }
    },
    responsive: true
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div style={{ width: '100%', height: '300px' }}>
        <Pie data={data} options={options} />
      </div>
    </ConfigProvider>
  );
};

export default TopWeaknessesChart;
