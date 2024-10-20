import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { ConfigProvider } from 'antd';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ImpactScoreBarChart = ({ impactData = [] }) => {
  const { confidentialityImpact, integrityImpact, availabilityImpact } = impactData[0] || {
    confidentialityImpact: 0,
    integrityImpact: 0,
    availabilityImpact: 0
  };

  const labels = ['Confidentiality', 'Integrity', 'Availability'];
  const dataValues = [confidentialityImpact, integrityImpact, availabilityImpact];

  const data = {
    labels,
    datasets: [{
      label: 'Number of Vulnerabilities',
      data: dataValues,
      backgroundColor: ['#36a2eb', '#ff6384', '#ffce56'],
    }],
  };

  const options = {
    responsive: true,
    scales: {
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { display: true, position: 'bottom' },
    },
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff", borderRadius: 2, colorBgContainer: "#ffffff" } }}>
      <Bar data={data} options={options} />
    </ConfigProvider>
  );
};

export default ImpactScoreBarChart;
