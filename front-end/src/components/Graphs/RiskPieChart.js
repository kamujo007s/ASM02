import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

const RiskPieChart = ({ riskLevels }) => {
  const colors = {
    Unknown: 'rgba(211, 211, 211, 0.6)',
    Critical: '#ff4d4f',
    High: '#fa8c16',
    Medium: '#ffc107',
    Low: '#52c41a',
  };

  const borderColor = {
    Unknown: 'rgba(211, 211, 211, 1)',
    Critical: '#ff4d4f',
    High: '#fa8c16',
    Medium: '#ffc107',
    Low: '#52c41a',
  };

  const sortedRiskLevels = sortRiskLevels(riskLevels);
  const labels = sortedRiskLevels.map(risk => risk.riskLevel);
  const dataValues = sortedRiskLevels.map(risk => risk.count);

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
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            return `${tooltipItem.label}: ${value} vulnerabilities`;
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="chart-box" style={{ width: '100%', height: '300px', marginTop: '20px' }}>
      <Pie data={data} options={options} />
    </div>
  );
};

const sortRiskLevels = (riskLevels) => {
  const riskOrder = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];
  return riskLevels.sort((a, b) => riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel));
};

export default RiskPieChart;
