import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Checkbox from "../ui/checkbox";
import { Label } from "../ui/label";

const ParameterDropdown = ({ parameters = [], selectedParams = [], onSelectionChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredParameters, setFilteredParameters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter parameters based on search term
  useEffect(() => {
    if (!parameters) return;

    const filtered = parameters.filter(param => 
      param && typeof param === 'string' && param.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredParameters(filtered);
  }, [searchTerm, parameters]);

  useEffect(() => {
    console.log("Parameters received by dropdown:", parameters);
  }, [parameters]);

  return (
    <div className="relative w-full md:w-auto">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="p-2 bg-orange-500/50 backdrop-blur-md text-white rounded-lg 
           font-semibold hover:bg-transparent transition shadow-md 
           flex items-center w-full md:w-auto justify-center mt-4 neon-glow border border-orange-400 
             shadow-[0_0_10px_orange] hover:shadow-[0_0_15px_orange]"
      >
        📊 Select Parameters
        <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
          {filteredParameters.length} available
        </span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isDropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute mt-2 w-full md:w-64 bg-gray-900/95 shadow-lg rounded-lg z-50 border border-gray-700"
        >
          {/* Search Input - Fixed at top */}
          <div className="sticky top-0 bg-gray-900/95 z-10 p-4 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search parameters..."
              className="w-full p-2 bg-gray-800/80 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* All Parameters Checkbox */}
          <div className="px-4 pt-2">
            <Label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-blue-500/20 backdrop-blur-md transition duration-300 hover:bg-blue-500/30">
              <Checkbox
                checked={selectedParams.includes("All Parameters")}
                onChange={(checked) => onSelectionChange("All Parameters", checked)}
              />
              <span className="text-white font-semibold">All Parameters</span>
            </Label>
          </div>

          {/* Parameters List - No scrolling */}
          <div className="px-4 pb-4">
            {filteredParameters.length === 0 ? (
              <div className="text-center text-gray-400 py-4">
                {parameters.length === 0 ? "No parameters available" : "No matching parameters found"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredParameters.map((param) => (
                  <Label
                    key={param}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-blue-500/10 backdrop-blur-md transition duration-300 hover:bg-blue-500/20"
                  >
                    <Checkbox
                      checked={selectedParams.includes(param)}
                      onChange={(checked) => onSelectionChange(param, checked)}
                    />
                    <div className="whitespace-nowrap overflow-hidden w-full">
                      <span
                        className="text-white font-medium inline-block"
                        style={{
                          animation: param.length > 20 ? "marquee 8s linear infinite" : "none",
                          paddingLeft: param.length > 20 ? "100%" : "0",
                          display: "inline-block",
                          minWidth: param.length > 20 ? "auto" : "100%"
                        }}
                        title={param}
                      >
                        {param}
                      </span>
                    </div>
                  </Label>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Marquee Animation CSS */}
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}
      </style>
    </div>
  );
};

export default ParameterDropdown;