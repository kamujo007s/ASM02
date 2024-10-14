// AttackVectorPieChart.js
import React, { useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { ConfigProvider, theme } from 'antd';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const AttackVectorPieChart = ({ vectorData }) => {
  const labels = vectorData.map(item => item.attackVector);
  const dataValues = vectorData.map(item => item.count);

  const data = {
    labels,
    datasets: [{
      label: 'Attack Vector',
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

export default AttackVectorPieChart;
