import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

const NormalGraphs = ({ groupedParams, filteredData, timeRange, isFullScreen, toggleFullScreen, handleDownload, setSelectedParams }) => {
  const neonColors = [
    "#ccff00", "#ff6600", "#ffff00", "#0099ff", "#00ff00", "#00ffff", "#ff00ff", "#ff0033", "#ff1493", "#9400d3", "#30d5c8", "#ff5555", "#008080", "#8a2be2", "#ffd700", "#4b0082",
  ];

  // Handle closing a parameter's graph
  const handleCloseGraph = (param) => {
    setSelectedParams((prev) => prev.filter((p) => p !== param));
  };

  // Calculate dynamic y-axis range with improved scaling for abnormal values
  const getYRange = (param) => {
    const values = filteredData
      .map((entry) => entry[param])
      .filter((val) => val !== undefined && !isNaN(val));
    if (values.length === 0) return { min: 0, max: 10 }; // Default range for empty data

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;

    // If range is zero or negative (e.g., all values are the same), use a small default step
    if (range <= 0) {
      const defaultStep = 1;
      return { min: minVal - defaultStep, max: minVal + defaultStep };
    }

    // Dynamic padding based on 10% of the range, with a minimum step of 1
    const padding = Math.max(range * 0.1, 1);
    const min = minVal - padding;
    const max = maxVal + padding;

    return { min, max };
  };

  return (
    <div className={`w-full ${isFullScreen ? "fixed inset-0 bg-gray-900/90 backdrop-blur-md z-50 p-6" : "max-w-6xl"}`}>
      {Object.keys(groupedParams).flatMap((groupKey) =>
        groupedParams[groupKey].map((param, paramIndex) => {
          const { min, max } = getYRange(param);

          return (
            <div
              key={`${groupKey}-${param}`}
              id={`chart-container-${groupKey}-${paramIndex}`}
              className={`bg-white/10 backdrop-blur-md p-5 shadow-lg rounded-lg mb-6 border border-white/20 ${isFullScreen ? "h-full relative z-10" : ""}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">📈 {param} Over Time</h2>
                <button
                  onClick={() => handleCloseGraph(param)}
                  className="p-1 bg-red-500/50 text-white font-semibold rounded-full hover:bg-red-600 transition w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div style={{ height: isFullScreen ? "calc(100vh - 200px)" : "450px" }}>
                <Line
                  id={`chart-${groupKey}-${paramIndex}`}
                  data={{
                    labels: filteredData.map((entry) => entry.local_date_time),
                    datasets: [{
                      label: param,
                      data: filteredData.map((entry) => ({
                        x: entry.local_date_time,
                        y: entry[param],
                        tm_id: entry.tm_id,
                      })),
                      borderColor: neonColors[paramIndex % neonColors.length],
                      fill: false,
                      pointBorderColor: neonColors[paramIndex % neonColors.length],
                      pointBackgroundColor: neonColors[paramIndex % neonColors.length],
                      pointRadius: 2,
                      pointHoverRadius: 3,
                      borderWidth: 3,
                      shadowBlur: 15,
                      shadowColor: neonColors[paramIndex % neonColors.length],
                      tension: 0.4,
                      spanGaps: true,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        type: 'category',
                        ticks: {
                          color: "white",
                          font: { size: 14 },
                        },
                        grid: { color: "rgba(255, 255, 255, 0.3)" },
                        title: {
                          display: true,
                          text: "TM Recv Local Date and Time",
                          color: "white",
                          font: { size: 14 },
                        },
                      },
                      y: {
                        ticks: {
                          color: "white",
                          font: { size: 14 },
                        },
                        grid: { color: "rgba(255, 255, 255, 0.3)" },
                        title: {
                          display: true,
                          text: param.includes("voltage") ? "Voltage (V)" : param.includes("current") ? "Current (A)" : "Value",
                          color: "white",
                          font: { size: 14 },
                        },
                        min: min,
                        max: max,
                      },
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (tooltipItem) => {
                            const paramName = tooltipItem.dataset.label;
                            const paramValue = tooltipItem.raw.y;
                            const tmId = tooltipItem.raw.tm_id;
                            return `${paramName}: ${paramValue} (TM Id: ${tmId})`;
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
                  onClick={() => handleDownload(`chart-${groupKey}-${paramIndex}`, timeRange.start, timeRange.end)}
                  className="p-2 bg-green-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-green-400 shadow-[0_0_10px_#00ff00] hover:shadow-[0_0_15px_#00ff00]"
                >
                  📥 Download Chart
                </button>
                <button
                  onClick={() => toggleFullScreen(`chart-container-${groupKey}-${paramIndex}`)}
                  className="p-2 bg-blue-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-blue-400 shadow-[0_0_10px_#0099ff] hover:shadow-[0_0_15px_#0099ff]"
                >
                  {isFullScreen ? "Minimize" : "Maximize"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default NormalGraphs;
