// ImpactScoreBarChart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ConfigProvider, theme } from 'antd';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ImpactScoreBarChart = ({ impactData }) => {
  const labels = impactData.map(item => item.cveId);
  const dataValues = impactData.map(item => item.impactScore);

  const data = {
    labels,
    datasets: [{
      label: 'Impact Score',
      data: dataValues,
      backgroundColor: '#cc65fe'
    }]
  };

  const options = {
    responsive: true,
    scales: { y: { beginAtZero: true } }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div style={{ width: '100%', height: '300px' }}>
        <Bar data={data} options={options} />
      </div>
    </ConfigProvider>
  );
};

export default ImpactScoreBarChart;
