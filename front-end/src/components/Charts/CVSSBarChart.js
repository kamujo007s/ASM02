// CVSSBarChart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ConfigProvider, theme } from 'antd';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CVSSBarChart = ({ cvssData }) => {
  const labels = ['Critical', 'High', 'Medium', 'Low'];
  const dataValues = [0, 0, 0, 0];  // เก็บจำนวนช่องโหว่ในแต่ละระดับความเสี่ยง

  cvssData.forEach(item => {
    if (item.cvssScore >= 9) {
      dataValues[0]++;
    } else if (item.cvssScore >= 7) {
      dataValues[1]++;
    } else if (item.cvssScore >= 4) {
      dataValues[2]++;
    } else {
      dataValues[3]++;
    }
  });

  const data = {
    labels,
    datasets: [{
      label: 'CVSS Score Severity',
      data: dataValues,
      backgroundColor: ['#ff4d4f', '#fa8c16', '#ffc107', '#52c41a']
    }]
  };

  const options = {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div style={{ width: '100%', height: '300px' }}>
        <Bar data={data} options={options} />
      </div>
    </ConfigProvider>
  );
};

export default CVSSBarChart;
