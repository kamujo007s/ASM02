// RiskBarChart.js
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { ConfigProvider, theme } from "antd";

ChartJS.register(BarElement, Tooltip, Legend, CategoryScale, LinearScale);

const RiskBarChart = ({ riskLevels, osName, version }) => {
  // กำหนดสีโดยใช้ธีมจาก ConfigProvider
  const colors = {
    Unknown: "rgba(211, 211, 211, 0.6)",
    Critical: "#ff4d4f", // สีแดงสำหรับ critical
    High: "#fa8c16", // ใช้สีจาก colorPrimary (ตาม theme.json)
    Medium: "#ffc107",
    Low: "#52c41a", // ใช้สีจาก colorSuccess (ตาม theme.json)
  };

  const borderColor = {
    Unknown: "rgba(211, 211, 211, 1)",
    Critical: "#ff4d4f",
    High: "#fa8c16",
    Medium: "#ffc107",
    Low: "#52c41a",
  };

  const sortedRiskLevels = sortRiskLevels(riskLevels);
  const labels = sortedRiskLevels.map((risk) => risk.riskLevel);
  const dataValues = sortedRiskLevels.map((risk) => risk.count);
  const totalCount = dataValues.reduce((a, b) => a + b, 0);

  const backgroundColors = sortedRiskLevels.map(
    (risk) => colors[risk.riskLevel] || "rgba(211, 211, 211, 0.6)"
  );
  const borderColors = sortedRiskLevels.map(
    (risk) => borderColor[risk.riskLevel] || "rgba(211, 211, 211, 1)"
  );

  const data = {
    labels: labels,
    datasets: [
      {
        label: "Vulnerabilities",
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
        display: false,
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
    responsive: true, // เปิดการตอบสนองต่อขนาดหน้าจอ
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
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm, // Use default (light) theme
        token: {
          colorPrimary: "#1890ff", // สีหลักตามธีมที่คุณเลือก
          borderRadius: 2, // ปรับ border-radius เป็น 2px
          colorBgContainer: "#ffffff", // พื้นหลังสีขาว
          colorTextBase: "#1f1f1f", // สีข้อความเป็นสีดำ
        },
      }}
    >
      <div className="chart-box" style={{ width: "100%", height: "300px" }}>
        <Bar data={data} options={options} />
      </div>
    </ConfigProvider>
  );
};

const sortRiskLevels = (riskLevels) => {
  const riskOrder = ["Critical", "High", "Medium", "Low", "Unknown"];
  return riskLevels.sort(
    (a, b) => riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel)
  );
};

export default RiskBarChart;