import React from "react";
import { motion } from "framer-motion";

const Insights = ({ data }) => {
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-gray-800 text-white p-4 rounded-xl shadow-lg w-96"
    >
      <h2 className="text-xl font-bold mb-2">📊 Insights</h2>
      {data.mean && <p>🔹 <strong>Mean:</strong> {data.mean}</p>}
      {data.trend && <p>📈 <strong>Trend:</strong> {data.trend}</p>}
      {data.booleanCounts && (
        <p>✅ <strong>On/Off Counts:</strong> {data.booleanCounts}</p>
      )}
    </motion.div>
  );
};

export default Insights;
