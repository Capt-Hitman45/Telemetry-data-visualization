import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const Epoch = () => {
    const [epochTime, setEpochTime] = useState("");
  const [convertedTime, setConvertedTime] = useState(null);
  const [showEpochConverter, setShowEpochConverter] = useState(false);
  const [currentEpochTime, setCurrentEpochTime] = useState(Math.floor(Date.now() / 1000));


const convertEpochToHumanDate = () => {
    if (epochTime) {
      const date = new Date(parseInt(epochTime) * 1000);
      const gmtTime = date.toUTCString();
      const istTime = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      setConvertedTime({ gmt: gmtTime, ist: istTime });
    }
  };

   useEffect(() => {
      const interval = setInterval(() => {
        setCurrentEpochTime(Math.floor(Date.now() / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }, []);

    return (
    <div>
        {/* Sliding Epoch Converter Panel */}
              <motion.div
                animate={{ x: showEpochConverter ? 0 : "100%" }}
                transition={{ duration: 0.4 }}
                className="fixed top-0 right-0 w-80 h-full bg-gray-500/10 backdrop-blur-md shadow-lg text-white p-4 flex flex-col items-center z-50 border border-white/20 neon-glow"
        >
                <button
                  onClick={() => setShowEpochConverter(!showEpochConverter)}
                  className="absolute left-[-40px] top-1/2 transform -translate-y-1/2 p-2 bg-blue-800 text-white rounded-l-lg flex items-center justify-center text-2xl font-bold border border-white/30 hover:bg-green-700 transition"
                >
                  {showEpochConverter ? "<" : ">"}
                </button>
        
                <h2 className="text-xl font-bold text-white mb-4">Epoch Converter</h2>
                <p className="text-sm text-white-300">Convert epoch timestamps to human-readable dates.</p>
        
                <div className="w-full mt-4">
                  <h3 className="text-lg font-semibold mb-2">Current Epoch Time:</h3>
                  <p className="text-white">{currentEpochTime}</p>
                </div>
        
                <div className="w-full mt-4">
                  <h3 className="text-lg font-semibold mb-2">Convert Epoch to Human Date:</h3>
                  <input
                    type="number"
                    placeholder="Enter epoch timestamp"
                    value={epochTime}
                    onChange={(e) => setEpochTime(e.target.value)}
                    className="p-2 border border-gray-400 rounded w-full bg-transparent text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={convertEpochToHumanDate}
                    className="mt-4 p-2 bg-orange-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-orange-400 shadow-[0_0_10px_orange] hover:shadow-[0_0_15px_orange]"
                  >
                    Convert
                  </button>
                  {convertedTime && (
                    <div className="mt-4">
                      <p className="text-white">GMT: {convertedTime.gmt}</p>
                      <p className="text-white">IST: {convertedTime.ist}</p>
                    </div>
                  )}
                </div>
              </motion.div>
              </div>

    );

};

    export default Epoch;