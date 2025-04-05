// src/components/DataVisualization.js
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DataVisualization = ({ data }) => {
  const chartData = {
    labels: data.map(entry => entry.timestamp),
    datasets: [
      {
        label: 'Telemetry Data',
        data: data.map(entry => entry.temperature || entry.value || entry.signal_strength),
        borderColor: 'rgba(75, 192, 192, 1)',
        fill: false,
      },
    ],
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Telemetry Data Visualization</h1>
      <div className="bg-white p-4 shadow-md rounded-lg w-full max-w-4xl">
        <Line data={chartData} />
      </div>
    </div>
  );
};

export default DataVisualization;