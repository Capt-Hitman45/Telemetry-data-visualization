import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

const BooleanGraphs = ({ groupedParams, filteredData, timeRange, isFullScreen, toggleFullScreen, handleDownload }) => {
  const neonColors = [
    "#ffff00", "#ff6600", "#0099ff", "#00ff00", "#00ffff", "#ff00ff", "#ff0033", "#ff1493", "#9400d3", "#30d5c8", "#ccff00", "#ff5555", "#008080", "#8a2be2", "#ffd700", "#4b0082",
  ];

  // Function to check if a parameter is numeric
  const isNumericParam = (param) => {
    const sampleValue = filteredData[0]?.[param];
    return !isNaN(parseFloat(sampleValue)) && isFinite(sampleValue);
  };

  return (
    <div className={`w-full ${isFullScreen ? "fixed inset-0 bg-gray-900/90 backdrop-blur-md z-50 p-6" : "max-w-6xl"}`}>
      {Object.keys(groupedParams).map((groupKey, index) => (
        <div
          key={groupKey}
          id={`chart-container-${index}`}
          className={`bg-white/10 backdrop-blur-md p-5 shadow-lg rounded-lg mb-6 border border-white/20 ${isFullScreen ? "h-full relative z-10" : ""}`}
        >
          <h2 className="text-lg font-semibold text-white mb-4">📈 {groupKey} Over Time</h2>
          <div style={{ height: isFullScreen ? "calc(100vh - 200px)" : "450px" }}>
            <Line
              id={`chart-${index}`}
              data={{
                labels: filteredData.map((entry) => entry.tm_received_time),
                datasets: groupedParams[groupKey].map((param, idx) => ({
                  label: param,
                  data: filteredData.map((entry) => ({
                    x: entry.tm_received_time,
                    y: entry[param], // Use the raw value directly
                  })),
                  borderColor: neonColors[idx % neonColors.length],
                  fill: false,
                  stepped: !isNumericParam(param), // Use stepped line for boolean data
                  pointBorderColor: neonColors[idx % neonColors.length],
                  pointBackgroundColor: neonColors[idx % neonColors.length],
                  pointRadius: 2,
                  pointHoverRadius: 3,
                  borderWidth: 3,
                  shadowBlur: 15,
                  shadowColor: neonColors[idx % neonColors.length],
                })),
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    ticks: {
                      color: "white",
                      font: { size: 14 },
                    },
                    grid: { color: "rgba(255, 255, 255, 0.3)" },
                  },
                  y: {
                    type: isNumericParam(groupedParams[groupKey][0]) ? "linear" : "category", // Dynamic scale
                    labels: isNumericParam(groupedParams[groupKey][0]) ? undefined : ["OFF", "ON"], // Labels for boolean parameters
                    ticks: {
                      color: "white",
                      font: { size: 14 },
                      callback: isNumericParam(groupedParams[groupKey][0])
                        ? undefined // Default numeric ticks
                        : (value) => value, // Display the string value directly
                    },
                    grid: { color: "rgba(255, 255, 255, 0.3)" },
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (tooltipItem) => {
                        const paramName = tooltipItem.dataset.label;
                        const paramValue = tooltipItem.raw.y;
                        return `${paramName}: ${paramValue}`; // Display the value in tooltips
                      },
                    },
                  },
                  legend: {
                    labels: {
                      color: "white",
                      font: { size: 14 },
                    },
                  },
                  zoom: {
                    pan: { enabled: true, mode: "x" },
                    zoom: {
                      wheel: { enabled: true },
                      drag: { enabled: true },
                      pinch: { enabled: true },
                      mode: "x",
                    },
                  },
                },
              }}
            />
          </div>

          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => handleDownload(`chart-${index}`, timeRange.start, timeRange.end)}
              className="p-2 bg-green-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-green-400 shadow-[0_0_10px_#00ff00] hover:shadow-[0_0_15px_#00ff00]"
            >
              📥 Download Chart
            </button>
            <button
              onClick={() => toggleFullScreen(`chart-container-${index}`)}
              className="p-2 bg-blue-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-blue-400 shadow-[0_0_10px_#0099ff] hover:shadow-[0_0_15px_#0099ff]"
            >
              {isFullScreen ? "Minimize" : "Maximize"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BooleanGraphs;