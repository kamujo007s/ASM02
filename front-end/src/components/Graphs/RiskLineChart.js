import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, LineElement, PointElement } from 'chart.js';

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, LineElement, PointElement);

const RiskLineChart = ({ assetsDataOverTime }) => {
  // ตรวจสอบว่า assetsDataOverTime มีข้อมูลก่อนใช้งาน
  if (!assetsDataOverTime || assetsDataOverTime.length === 0) {
    return <p>No data available for Assets Over Time.</p>;  // แสดงข้อความถ้าไม่มีข้อมูล
  }

  const labels = assetsDataOverTime.map(item => item.year);  // ใช้ปีเป็น label สำหรับแกน x

  // ดึง OS ทั้งหมดที่มีอยู่ในข้อมูล เพื่อสร้างชุดข้อมูลแต่ละ OS
  const osList = [...new Set(assetsDataOverTime.flatMap(item => item.osCounts.map(os => os.operating_system)))];

  // สร้าง datasets สำหรับแต่ละ OS
  const datasets = osList.map(os => {
    return {
      label: os,
      data: assetsDataOverTime.map(item => {
        const osData = item.osCounts.find(osCount => osCount.operating_system === os);
        return osData ? osData.count : 0;  // ถ้า OS นั้นไม่มีข้อมูลให้ใช้ค่า 0
      }),
      fill: false,
      borderColor: '#'+Math.floor(Math.random()*16777215).toString(16),  // สุ่มสีเส้น
      pointBorderColor: '#fff',
      pointBackgroundColor: '#fa8c16',
      borderWidth: 2,
      tension: 0.1,
    };
  });

  const data = {
    labels: labels,
    datasets: datasets,
  };

  const options = {
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.dataset.label}: ${tooltipItem.raw} Assets`;
          },
        },
      },
    },
    responsive: true,
    scales: {
      x: {
        beginAtZero: false,
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '20px' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default RiskLineChart;
