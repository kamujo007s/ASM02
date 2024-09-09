// RiskBarChart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(BarElement, Tooltip, Legend, CategoryScale, LinearScale);

const RiskBarChart = ({ riskLevels, osName, version }) => {
  const colors = {
    Unknown: 'rgba(211, 211, 211, 0.6)',
    Critical: 'rgba(255, 99, 132, 0.7)',
    High: 'rgba(255, 165, 0, 0.7)',
    Medium: 'rgba(255, 206, 86, 0.7)',
    Low: 'rgba(75, 192, 192, 0.7)',
  };

  const borderColor = {
    Unknown: 'rgba(211, 211, 211, 1)',
    Critical: 'rgba(255, 99, 132, 1)',
    High: 'rgba(255, 165, 0, 1)',
    Medium: 'rgba(255, 206, 86, 1)',
    Low: 'rgba(75, 192, 192, 1)',
  };

  const sortedRiskLevels = sortRiskLevels(riskLevels);
  const labels = sortedRiskLevels.map(risk => risk.riskLevel);
  const dataValues = sortedRiskLevels.map(risk => risk.count);
  const totalCount = dataValues.reduce((a, b) => a + b, 0);

  const backgroundColors = sortedRiskLevels.map(risk => colors[risk.riskLevel] || 'rgba(211, 211, 211, 0.6)');
  const borderColors = sortedRiskLevels.map(risk => borderColor[risk.riskLevel] || 'rgba(211, 211, 211, 1)');

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Vulnerabilities',
        data: dataValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: false, // ซ่อน legend สำหรับกราฟแท่ง
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            const percentage = ((value / totalCount) * 100).toFixed(2);
            return `${tooltipItem.label}: ${value} vulnerabilities (${percentage}%)`;
          },
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div style={{ width: '300px', height: '300px', margin: '20px' }}>
      <h4>{osName} - {version}</h4>
      <Bar data={data} options={options} />
    </div>
  );
};

const sortRiskLevels = (riskLevels) => {
  const riskOrder = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];
  return riskLevels.sort((a, b) => riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel));
};

export default RiskBarChart;
