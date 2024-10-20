// Top5OSCurrentYearChart.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

const Top5OSCurrentYearChart = () => {
  const [top5OS, setTop5OS] = useState([]);
  const currentYear = new Date().getFullYear(); // ปีปัจจุบัน

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3012/cve/top-5-os-current-year', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTop5OS(response.data);
      } catch (error) {
        console.error('Error fetching top 5 OS:', error);
      }
    };

    fetchData();
  }, []);


  return (
    <div>
      <h4>Top 5 Operating Systems Chart by Vulnerabilities in {currentYear}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={top5OS}
              layout="vertical"
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="_id" type="category" />
              <Tooltip />
              <Bar dataKey="totalVulns" fill="#fa8c16">
                <LabelList dataKey="totalVulns" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
    </div>
  );
};

export default Top5OSCurrentYearChart;
