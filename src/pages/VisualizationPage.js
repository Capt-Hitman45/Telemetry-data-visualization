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

  // Simplify text-based data for plotting
  const simplifyTextData = (data, param) => {
    if (data.length === 0) return [];

    const simplifiedData = [];
    let previousValue = null;

    data.forEach((entry, index) => {
      const value = entry[param];
      const numericValue = textValueMappings[param]?.[value] ?? value;

      if (index === 0 || numericValue !== previousValue) {
        simplifiedData.push({ 
          x: entry.tm_received_time, 
          y: numericValue, 
          tm_id: entry.tm_id 
        });
      }
      previousValue = numericValue;
    });

    return simplifiedData;
  };

  // Process data whenever rawData changes
  useEffect(() => {
    const processData = () => {
      if (!rawData || rawData.length === 0) return;
  
      const allParameters = new Set();
      const textMappings = {};
      const formattedData = [];
  
      // Process each entry
      rawData.forEach(entry => {
        if (!entry) return;
  
        // Add parameter to tracking
        if (entry.parameter) {
          allParameters.add(entry.parameter);
        }
  
        // Check for text parameters
        if (entry.value && isNaN(entry.value)) {
          if (!textMappings[entry.parameter]) {
            textMappings[entry.parameter] = new Set();
          }
          textMappings[entry.parameter].add(entry.value);
        }
  
        // Create formatted entry
        const formattedEntry = {
          tm_received_time: entry.tm_received_time,
          tm_id: entry.tm_id,
          [entry.parameter]: isNaN(entry.value) ? entry.value : parseFloat(entry.value)
        };
        
        formattedData.push(formattedEntry);
      });
  
      // Create text value mappings
      const finalTextMappings = {};
      Object.keys(textMappings).forEach(param => {
        finalTextMappings[param] = Array.from(textMappings[param]).reduce((acc, val, idx) => {
          acc[val] = idx + 1;
          return acc;
        }, {});
      });
  
      // Sort parameters
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
  
      // Actually use the formattedData we created
      setProcessedData(formattedData);
      setTextValueMappings(finalTextMappings);
      setParameters(sortedParameters);
    };
  
    processData();
  }, [rawData]);
  
  useEffect(() => {
  const fetchInitialData = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/telemetry?collection=${collection}`
      );
      const data = await response.json();
      console.log("Raw API response:", data); // Debug output
      setRawData(data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };
  fetchInitialData();
}, [collection]);

useEffect(() => {
  if (!collection || collection === "Unknown Collection") return;

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/telemetry?collection=${collection}`
      );
      const data = await response.json();
      setRawData(data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  fetchInitialData();

    // 2. Set up SSE for real-time updates
    const eventSource = new EventSource(
      `http://localhost:4000/api/telemetry/updates?collection=${collection}`
    );

    eventSource.onmessage = (event) => {
      if (event.data === ':ping') return;
      
      try {
        const newData = JSON.parse(event.data);
        setRawData(prevData => {
          // Check if this is a duplicate
          const exists = prevData.some(item => 
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
      // Implement reconnection logic here if needed
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
    setSelectedParams((prev) => 
      checked ? [...prev, param] : prev.filter((p) => p !== param)
    );
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
      const base = param.replace(/(_voltage|_current|_\d+)$/, '');
      if (!groups[base]) groups[base] = [];
      groups[base].push(param);
    });
    return groups;
  };

  // Grouped parameters for dropdown
  const groupedParams = useMemo(() => {
    const groups = groupParameters(selectedParams.filter((param) => param !== "All Parameters"));
    if (selectedParams.includes("All Parameters")) {
      groups["All Parameters"] = parameters;
    }
    return groups;
  }, [selectedParams, parameters]);

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
    
    // Numeric parameter insights
    parameters.filter(p => !isTextParam(p)).forEach((param) => {
      const values = filteredData
        .map(entry => parseFloat(entry[param]))
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        insights.push(`${param}: Min ${min.toFixed(2)}, Max ${max.toFixed(2)}, Avg ${avg.toFixed(2)}`);
      }
    });

    // Text parameter insights
    parameters.filter(isTextParam).forEach((param) => {
      const valueCounts = {};
      filteredData.forEach(entry => {
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
          {selectedParams.some(isTextParam) ? (
            <BooleanGraphs
              groupedParams={groupedParams}
              simplifyTextData={simplifyTextData}
              filteredData={filteredData}
              timeRange={timeRange}
              isFullScreen={isFullScreen}
              toggleFullScreen={toggleFullScreen}
              handleDownload={handleDownload}
              textValueMappings={textValueMappings}
            />
          ) : (
            <NormalGraphs
              groupedParams={groupedParams}
              filteredData={filteredData}
              timeRange={timeRange}
              isFullScreen={isFullScreen}
              toggleFullScreen={toggleFullScreen}
              handleDownload={handleDownload}
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
