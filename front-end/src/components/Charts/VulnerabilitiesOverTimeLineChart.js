// VulnerabilitiesOverTimeLineChart.js
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { ConfigProvider } from 'antd';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const VulnerabilitiesOverTimeLineChart = ({ vulnerabilitiesData = [] }) => {
  const yearCount = {};
  vulnerabilitiesData.forEach(vuln => {
    const year = vuln._id.year ?? 'Unknown'; // Fallback to 'Unknown'
    yearCount[year] = (yearCount[year] || 0) + vuln.totalCount;
  });

  const labels = Object.keys(yearCount);
  const dataValues = Object.values(yearCount);

  const data = {
    labels,
    datasets: [{
      label: 'Number of Vulnerabilities',
      data: dataValues,
      fill: false,
      borderColor: '#1890ff',
      backgroundColor: '#1890ff',
      tension: 0.1,
    }],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff", borderRadius: 2, colorBgContainer: "#ffffff" } }}>
      <Line data={data} options={options} />
    </ConfigProvider>
  );
};

export default VulnerabilitiesOverTimeLineChart;
