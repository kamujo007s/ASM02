//AttackVectorChart.js

import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { ConfigProvider, theme } from 'antd';

ChartJS.register(ArcElement, Tooltip, Legend);

const AttackVectorChart = ({ vectorData }) => {
  const labels = vectorData.map(item => item.attackVector);
  const dataValues = vectorData.map(item => item.count);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Attack Vector',
        data: dataValues,
        backgroundColor: [
          '#ff6384',
          '#36a2eb',
          '#cc65fe',
          '#ffce56',
          '#36eb9e',
        ],
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    responsive: true,
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 2,
          colorBgContainer: "#ffffff",
          colorTextBase: "#1f1f1f",
        },
      }}
    >
      <div style={{ width: '100%', height: '300px' }}>
        <Pie data={data} options={options} />
      </div>
    </ConfigProvider>
  );
};

export default AttackVectorChart;
