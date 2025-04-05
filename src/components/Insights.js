import React from "react";
import { motion } from "framer-motion";

const Insights = ({ insights, showInsights, onCloseInsights }) => {
  if (!showInsights) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-6xl mx-auto mt-10 p-6 bg-black text-green-400 font-mono rounded-lg shadow-lg overflow-y-auto max-h-60 border border-gray-700"
    >
      <h2 className="text-2xl font-bold mb-4"> 📊 Insights (Terminal)</h2>
      <pre className="text-sm leading-relaxed">
        {insights.map((insight, index) => (
          <div key={index} className="border-l-4 border-green-400 pl-3">
            {`> ${insight}`}
          </div>
        ))}
      </pre>
      <button
        onClick={onCloseInsights}
        className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-md hover:bg-red-600 transition"
      >
        ✖ Close
      </button>
    </motion.div>
  );
};

export default Insights;


// import React from "react";
// import { motion } from "framer-motion";

// const Insights = ({ insights, showInsights, onCloseInsights }) => {
//   if (!showInsights) return null;

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5, ease: "easeOut" }}
//       className="w-full max-w-6xl mx-auto mt-10 p-6 bg-black text-green-400 font-mono rounded-lg shadow-lg overflow-y-auto max-h-60 border border-gray-700"
//     >
//       <h2 className="text-2xl font-bold mb-4"> 📊 Insights (Terminal)</h2>
//       <pre className="text-sm leading-relaxed">
//         {insights.map((insight, index) => (
//           <div key={index} className="border-l-4 border-green-400 pl-3">
//             {`> ${insight}`}
//           </div>
//         ))}
//       </pre>
//       <button
//         onClick={onCloseInsights}
//         className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-md hover:bg-red-600 transition"
//       >
//         ✖ Close
//       </button>
//     </motion.div>
//   );
// };

// export default Insights;