import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import Stars from "../ui/Stars";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

const Graphs = ({ groupedParams, filteredData, isBooleanParam, simplifyBooleanData, timeRange, isFullScreen, toggleFullScreen, handleDownload }) => {
  const neonColors = [
    "#ffff00", "#ff6600", "#0099ff", "#00ff00", "#00ffff", "#ff00ff", "#ff0033", "#ff1493", "#9400d3", "#30d5c8", "#ccff00", "#ff5555", "#008080", "#8a2be2", "#ffd700", "#4b0082",
  ];

  const normalColors = [
    "#4B5320", "#8B4513", "#0047AB", "#006400", "#005F6A", "#4B0082", "#b2001f", "#b2106b", "#5d009b", "#1e8b89", "#99cc00", "#cc4444", "#005050", "#5d1fae", "#b38f00", "#320062",
  ];

  const getYAxisConfig = (isBoolean) => {
    return {
      type: isBoolean ? "category" : "linear", // Use 'category' for boolean, 'linear' for numeric
      labels: isBoolean ? ["OFF", "ON"] : undefined, // Labels for boolean parameters
      ticks: {
        color: "white",
        font: { size: 14 },
        callback: isBoolean
          ? (value) => (value === "ON" ? "ON" : value === "OFF" ? "OFF" : "") // Display ON/OFF for boolean
          : undefined, // Default numeric ticks for non-boolean
      },
      grid: { color: "rgba(255, 255, 255, 0.3)" },
    };
  };

  const prepareChartForDownload = (chartId) => {
    const chartInstance = ChartJS.getChart(chartId);
    if (!chartInstance) return;

    chartInstance.options.scales.x.ticks.color = "black";
    chartInstance.options.scales.y.ticks.color = "black";
    chartInstance.options.scales.x.grid.color = "rgba(0, 0, 0, 0.3)";
    chartInstance.options.scales.y.grid.color = "rgba(0, 0, 0, 0.3)";
    chartInstance.options.plugins.legend.labels.color = "black";

    chartInstance.data.datasets.forEach((dataset, idx) => {
      dataset.borderColor = normalColors[idx % normalColors.length];
      dataset.pointBorderColor = normalColors[idx % normalColors.length];
      dataset.pointBackgroundColor = normalColors[idx % normalColors.length];
    });

    chartInstance.update();

    setTimeout(() => {
      handleDownload(chartId, timeRange.start, timeRange.end);

      setTimeout(() => {
        chartInstance.options.scales.x.ticks.color = "white";
        chartInstance.options.scales.y.ticks.color = "white";
        chartInstance.options.scales.x.grid.color = "rgba(255, 255, 255, 0.3)";
        chartInstance.options.scales.y.grid.color = "rgba(255, 255, 255, 0.3)";
        chartInstance.options.plugins.legend.labels.color = "white";

        chartInstance.data.datasets.forEach((dataset, idx) => {
          dataset.borderColor = neonColors[idx % neonColors.length];
          dataset.pointBorderColor = neonColors[idx % neonColors.length];
          dataset.pointBackgroundColor = neonColors[idx % neonColors.length];
        });

        chartInstance.update();
      }, 100);
    }, 100);
  };

  return (
    <div className={`w-full ${isFullScreen ? "fixed inset-0 bg-gray-900/90 backdrop-blur-md z-50 p-6" : "max-w-6xl"}`}>
      {isFullScreen && (
        <div className="fixed inset-0 z-0">
          <Stars />
        </div>
      )}

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
                datasets: groupedParams[groupKey].map((param, idx) => {
                  const isBoolean = isBooleanParam(param);
                  return {
                    label: param,
                    data: isBoolean
                      ? simplifyBooleanData(filteredData, param) // Use string values for boolean data
                      : filteredData.map((entry) => ({
                          x: entry.tm_received_time,
                          y: entry[param],
                        })),
                    borderColor: neonColors[idx % neonColors.length],
                    fill: false,
                    stepped: isBoolean, // Use stepped line for boolean data
                    pointBorderColor: neonColors[idx % neonColors.length],
                    pointBackgroundColor: neonColors[idx % neonColors.length],
                    pointRadius: 2,
                    pointHoverRadius: 3,
                    borderWidth: 3,
                    shadowBlur: 15,
                    shadowColor: neonColors[idx % neonColors.length],
                  };
                }),
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
                  y: getYAxisConfig(groupedParams[groupKey].some((param) => isBooleanParam(param))), // Dynamic y-axis config
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (tooltipItem) => {
                        const paramName = tooltipItem.dataset.label;
                        const paramValue = tooltipItem.raw.y;
                        const isBoolean = isBooleanParam(paramName);
                        return `${paramName}: ${isBoolean ? paramValue : paramValue}`; // Display the value in tooltips
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
              onClick={() => prepareChartForDownload(`chart-${index}`)}
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

export default Graphs;
