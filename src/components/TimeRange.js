import React from "react";

const TimeRange = ({ timeRange, onTimeRangeChange, onReset }) => {
  return (
    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
      <input
        type="number"
        placeholder="Start Time"
        value={timeRange.start}
        onChange={(e) => onTimeRangeChange({ ...timeRange, start: e.target.value })}
        className="p-2 border rounded-lg w-full md:w-40 shadow-sm focus:ring-2 focus:ring-blue-500 bg-purple-500/20 backdrop-blur-md font-semibold"
      />
      <input
        type="number"
        placeholder="End Time"
        value={timeRange.end}
        onChange={(e) => onTimeRangeChange({ ...timeRange, end: e.target.value })}
        className="p-2 border rounded-lg w-full md:w-40 shadow-sm focus:ring-2 focus:ring-blue-500 bg-blue-500/20 backdrop-blur-md font-semibold"
      />
      <button
        onClick={onReset}
        className="p-2 bg-orange-500/50 backdrop-blur-md text-white font-semibold 
             rounded-lg hover:bg-transparent transition 
             w-full md:w-auto neon-glow border border-orange-400 
             shadow-[0_0_10px_orange] hover:shadow-[0_0_15px_orange]"
>
        🗘 Reset Time Range
      </button>
    </div>
  );
};

export default TimeRange;