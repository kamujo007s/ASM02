// CVSSSeverityBarChart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { ConfigProvider, theme } from 'antd';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CVSSSeverityBarChart = ({ cvssData }) => {
  const labels = ['Low', 'Medium', 'High', 'Critical'];
  const dataValues = [0, 0, 0, 0];

  cvssData.forEach(item => {
    switch (item.riskLevel) {
      case 'Low':
        dataValues[0] += 1;
        break;
      case 'Medium':
        dataValues[1] += 1;
        break;
      case 'High':
        dataValues[2] += 1;
        break;
      case 'Critical':
        dataValues[3] += 1;
        break;
      default:
        break;
    }
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Number of Vulnerabilities',
        data: dataValues,
        backgroundColor: ['#52c41a', '#fa8c16', '#ff4d4f', '#f5222d'],
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff", borderRadius: 2, colorBgContainer: "#ffffff" } }}>
      <Bar data={data} options={options} />
    </ConfigProvider>
  );
};

export default CVSSSeverityBarChart;
