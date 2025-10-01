import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import ParameterDropdown from "../components/ParameterDropdown";
import TimeRange from "../components/TimeRange";
import NormalGraphs from "../Graphs/NormalGraphs";
import BooleanGraphs from "../Graphs/BooleanGraphs";
import Epoch from "../components/Epoch";
import Insights from "../components/Insights";
import Stars from "../ui/Stars";

const VisualizationPage = () => {
  const location = useLocation();
  const { satellite = { name: "Unknown Satellite" }, dbName = "Unknown Database", collection = "Unknown Collection" } = location.state || {};

  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
  const [timeRange, setTimeRange] = useState({ start: "", end: "" });
  const [insights, setInsights] = useState([]);
  const [showInsights, setShowInsights] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [textValueMappings, setTextValueMappings] = useState({});

  // Check if a parameter is text-based
  const isTextParam = (param) => {
    return textValueMappings.hasOwnProperty(param);
  };

  // Process data whenever rawData changes
  useEffect(() => {
    const processData = () => {
      if (!rawData || rawData.length === 0) return;

      const allParameters = new Set();
      const textMappings = {};
      const formattedData = [];

      rawData.forEach((entry) => {
        if (!entry) return;

        if (entry.parameter) {
          allParameters.add(entry.parameter);
        }

        if (entry.value && isNaN(entry.value)) {
          if (!textMappings[entry.parameter]) {
            textMappings[entry.parameter] = new Set();
          }
          textMappings[entry.parameter].add(entry.value);
        }

        const formattedEntry = {
          tm_received_time: entry.tm_received_time,
          tm_id: entry.tm_id,
          local_date_time: entry.local_date_time, // Include local date time
          [entry.parameter]: isNaN(entry.value) ? entry.value : parseFloat(entry.value),
        };

        formattedData.push(formattedEntry);
      });

      const finalTextMappings = {};
      Object.keys(textMappings).forEach((param) => {
        finalTextMappings[param] = Array.from(textMappings[param]).reduce((acc, val, idx) => {
          acc[val] = idx + 1;
          return acc;
        }, {});
      });

      const sortedParameters = Array.from(allParameters).sort((a, b) => {
        const aIsVoltage = a.includes("voltage");
        const bIsVoltage = b.includes("voltage");
        const aIsCurrent = a.includes("current");
        const bIsCurrent = b.includes("current");

        if (aIsVoltage && !bIsVoltage) return -1;
        if (bIsVoltage && !aIsVoltage) return 1;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (bIsCurrent && !aIsCurrent) return 1;
        return a.localeCompare(b);
      });

      setProcessedData(formattedData);
      setTextValueMappings(finalTextMappings);
      setParameters(sortedParameters);

      // Update timeRange.end if new data exceeds current end
      const timestamps = formattedData.map((entry) => entry.tm_received_time);
      if (timestamps.length > 0) {
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        setTimeRange(prev => {
          const newStart = prev.start ? Math.min(prev.start, minTime) : minTime;
          const newEnd = prev.end ? Math.max(prev.end, maxTime) : maxTime;
          return {
            start: newStart.toString(),
            end: newEnd.toString(),
          };
        });
      }
    };

    processData();
  }, [rawData]);

  useEffect(() => {
    if (!collection || collection === "Unknown Collection") return;

    const fetchInitialData = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/telemetry?collection=${collection}`);
        const data = await response.json();
        console.log("Raw API response:", data);
        setRawData(data);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();

    const eventSource = new EventSource(`http://localhost:4000/api/telemetry/updates?collection=${collection}`);

    eventSource.onmessage = (event) => {
      if (event.data === ":ping") return;

      try {
        const newData = JSON.parse(event.data);
        setRawData((prevData) => {
          const exists = prevData.some(
            (item) =>
              item.tm_received_time === newData.tm_received_time &&
              item.tm_id === newData.tm_id &&
              item.parameter === newData.parameter
          );

          return exists ? prevData : [...prevData, newData];
        });
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [collection]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    return processedData.filter((entry) => {
      if (!timeRange.start || !timeRange.end) return true;
      const entryTime = Number(entry.tm_received_time);
      return entryTime >= Number(timeRange.start) && entryTime <= Number(timeRange.end);
    });
  }, [processedData, timeRange]);

  // Handle parameter selection
  const handleSelectionChange = (param, checked) => {
    setSelectedParams((prev) => (checked ? [...prev, param] : prev.filter((p) => p !== param)));
  };

  // Handle "All Parameters" selection
  const handleAllParamsPlot = () => {
    setSelectedParams((prev) => {
      if (prev.includes("All Parameters")) {
        return prev.filter((p) => p !== "All Parameters");
      }
      return [...prev, "All Parameters"];
    });
  };

  // Group parameters by base name
  const groupParameters = (params) => {
    const groups = {};
    params.forEach((param) => {
      const base = param.replace(/(_voltage|_current|_\d+)$/, "");
      if (!groups[base]) groups[base] = [];
      groups[base].push(param);
    });
    return groups;
  };

  // Split grouped parameters into boolean and numeric groups
  const groupedParams = useMemo(() => {
    const allGroups = groupParameters(selectedParams.filter((param) => param !== "All Parameters"));
    if (selectedParams.includes("All Parameters")) {
      allGroups["All Parameters"] = parameters;
    }

    const booleanGroups = {};
    const numericGroups = {};

    Object.keys(allGroups).forEach((groupKey) => {
      const params = allGroups[groupKey];
      if (params.some(isTextParam)) {
        booleanGroups[groupKey] = params.filter(isTextParam);
      } else {
        numericGroups[groupKey] = params;
      }
    });

    return { booleanGroups, numericGroups };
  }, [selectedParams, parameters, textValueMappings]);

  // Handle downloading chart as PNG
  const handleDownload = (chartId, startTime, endTime) => {
    const chartCanvas = document.getElementById(chartId);
    if (!chartCanvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = chartCanvas.width;
    tempCanvas.height = chartCanvas.height;
    const ctx = tempCanvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(chartCanvas, 0, 0);

    const filename = `TelemetryGraph_${startTime || "start"}_${endTime || "end"}.png`;
    const link = document.createElement("a");
    link.href = tempCanvas.toDataURL("image/png");
    link.download = filename;
    link.click();
  };

  // Handle fullscreen toggle
  const toggleFullScreen = (chartId) => {
    const chartContainer = document.getElementById(chartId);
    if (!chartContainer) return;

    if (!isFullScreen) {
      chartContainer.requestFullscreen?.() ||
        chartContainer.mozRequestFullScreen?.() ||
        chartContainer.webkitRequestFullscreen?.() ||
        chartContainer.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() ||
        document.mozCancelFullScreen?.() ||
        document.webkitExitFullscreen?.() ||
        document.msExitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  // Handle insights generation
  const handleDrawInsights = () => {
    const insights = [];

    parameters
      .filter((p) => !isTextParam(p))
      .forEach((param) => {
        const values = filteredData
          .map((entry) => parseFloat(entry[param]))
          .filter((val) => !isNaN(val));

        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          if (!isNaN(min) && !isNaN(max) && !isNaN(avg)) {
            insights.push(`${param}: Min ${min.toFixed(2)}, Max ${max.toFixed(2)}, Avg ${avg.toFixed(2)}`);
          }
        }
      });

    parameters.filter(isTextParam).forEach((param) => {
      const valueCounts = {};
      filteredData.forEach((entry) => {
        const val = entry[param];
        if (val) valueCounts[val] = (valueCounts[val] || 0) + 1;
      });

      const stats = Object.entries(valueCounts)
        .map(([val, count]) => `${val} (${count})`)
        .join(", ");

      if (stats) insights.push(`${param}: ${stats}`);
    });

    setInsights(insights);
    setShowInsights(true);
  };

  return (
    <div className="p-6 min-h-screen flex flex-col items-center overflow-y-auto relative">
      <div className="absolute top-10 left-10 m-4 pointer-events-none">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-72 h-18 drop-shadow-[0_0_6px_white] animate-glow"
        />
      </div>

      <style>
        {`
    @keyframes glow {
      0% {
        filter: drop-shadow(0 0 4px white) drop-shadow(0 0 7px white);
      }
      100% {
        filter: drop-shadow(0 0 7px white) drop-shadow(0 0 7px white);
      }
    }
    .animate-glow {
      animation: glow 1s infinite alternate;
    }
  `}
      </style>
      <Stars />
      <Epoch />

      <h1 className="text-3xl font-bold mb-6">🚀 Telemetry Data Visualization</h1>

      <div className="bg-white/10 backdrop-blur-md p-5 shadow-lg rounded-lg mb-6 border border-white/20 neon-glow border border-orange-400 shadow-[0_0_10px_orange] hover:shadow-[0_0_15px_orange]">
        <h2 className="text-lg font-semibold text-white mb-4">
          Name of the Satellite: <span className="text-green-400">{satellite.name}</span>
        </h2>
        <h2 className="text-lg font-semibold text-white mb-4">
          Database Name: <span className="text-green-400">{dbName}</span>
        </h2>
        <h2 className="text-lg font-semibold text-white">
          Collection Name: <span className="text-green-400">{collection}</span>
        </h2>
      </div>

      <div className="mb-8 w-full max-w-8xl flex flex-col md:flex-row justify-between items-center md:items-start space-y-4 md:space-y-0 md:space-x-4">
        <ParameterDropdown
          parameters={parameters}
          selectedParams={selectedParams}
          onSelectionChange={handleSelectionChange}
          onAllParamsPlot={handleAllParamsPlot}
        />
        <TimeRange timeRange={timeRange} onTimeRangeChange={setTimeRange} onReset={() => setTimeRange({ start: "", end: "" })} />
      </div>

      {selectedParams.length > 0 && (
        <>
          {Object.keys(groupedParams.booleanGroups).length > 0 && (
            <BooleanGraphs
              groupedParams={groupedParams.booleanGroups}
              filteredData={filteredData}
              timeRange={timeRange}
              isFullScreen={isFullScreen}
              toggleFullScreen={toggleFullScreen}
              handleDownload={handleDownload}
              setSelectedParams={setSelectedParams}
              textValueMappings={textValueMappings}
            />
          )}
          {Object.keys(groupedParams.numericGroups).length > 0 && (
            <NormalGraphs
              groupedParams={groupedParams.numericGroups}
              filteredData={filteredData}
              timeRange={timeRange}
              isFullScreen={isFullScreen}
              toggleFullScreen={toggleFullScreen}
              handleDownload={handleDownload}
              setSelectedParams={setSelectedParams}
            />
          )}
        </>
      )}

      <button
        onClick={handleDrawInsights}
        className="p-3 bg-purple-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition shadow-md flex items-center justify-center neon-glow border border-purple-400 shadow-[0_0_10px_purple] hover:shadow-[0_0_15px_purple]"
      >
        Draw Insights 🤔💭
      </button>

      <Insights insights={insights} showInsights={showInsights} onCloseInsights={() => setShowInsights(false)} />
    </div>
  );
};

export default VisualizationPage;
