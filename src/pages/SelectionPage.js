import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import Epoch from "../components/Epoch";
import Stars from "../ui/Stars";

const satellites = [
  {
    id: "ns",
    image: "/satelite-1.png",
    logo: "/NS-1.png",
    name: "XD SAT-NS",
  },
  {
    id: "nl",
    image: "/satelite-2.png",
    logo: "/NL-1.png",
    name: "XD SAT-NL",
  },
  {
    id: "m200",
    image: "/satelite-3.png",
    logo: "/M200-1.png",
    name: "XD SAT-M200",
  },
  {
    id: "m400",
    image: "/satelite-4.png",
    logo: "/M400-1.png",
    name: "XD SAT-M400",
  },
  {
    id: "m600",
    image: "/satelite-5.png",
    logo: "/M600-1.png",
    name: "XD SAT-M600",
  },
];

const SatelliteSelectionPage = () => {
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [dbName, setDbName] = useState("telemetry_db");
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      const { satellite } = location.state;
      setSelectedSatellite(satellite || null);
    }
  }, [location.state]);

  const handleDbNameChange = (e) => {
    setDbName(e.target.value);
  };

  const handleFetchCollections = async () => {
    if (!dbName) {
      alert("Please enter a database name");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/collections?dbName=${dbName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setCollections(data.collections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      alert("Failed to fetch collections. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedSatellite || !dbName || !selectedCollection) {
      alert("Please select a satellite, enter a database name, and select a collection.");
      return;
    }
    setShowPopup(true);
  };

  const handleRedirect = () => {
    navigate("/visualization", {
      state: {
        satellite: selectedSatellite,
        dbName,
        collection: selectedCollection,
      },
    });
  };

  return (
    <div className="p-6 min-h-screen flex flex-col items-center relative overflow-hidden">
      <Stars />

      <div className="absolute top-10 left-10 m-4">
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
          @keyframes floatAnimation {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
            100% {
              transform: translateY(0px);
            }
          }
          .animate-glow {
            animation: glow 1s infinite alternate;
          }
          .hover-glow:hover {
            filter: drop-shadow(0 0 10px white) drop-shadow(0 0 15px white);
          }
          .floating-satellite {
            animation: floatAnimation 3s ease-in-out infinite;
          }
        `}
      </style>

      <Epoch />

      <div className="relative z-10 w-full max-w-7xl mt-16">
        <h1 className="text-3xl font-bold mb-16 text-white glow text-center">🚀 Satellite Selection</h1>

        {/* Straight Horizontal Satellite Selection */}
        <div className="flex justify-between items-center w-full gap-x-24 mb-16">
          {satellites.map((satellite) => (
            <div key={satellite.id} className="flex flex-col items-center">
              <div className="floating-satellite">
                <img
                  src={satellite.image}
                  alt={`Satellite ${satellite.name}`}
                  className={`w-80 h-45 cursor-pointer transition-all duration-300 hover:scale-110
                  ${selectedSatellite?.id === satellite.id ? "animate-glow" : ""}`}
                  onMouseEnter={(e) => {
                    if (selectedSatellite?.id !== satellite.id) {
                      e.currentTarget.classList.add("hover-glow");
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSatellite?.id !== satellite.id) {
                      e.currentTarget.classList.remove("hover-glow");
                    }
                  }}
                  onClick={() => setSelectedSatellite(satellite)}
                />
              </div>
              <span className="text-white mt-4 text-lg font-semibold">{satellite.name}</span>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2 text-white glow">Enter MongoDB Database Name:</label>
          <input
            type="text"
            value={dbName}
            onChange={handleDbNameChange}
            className="p-2 border border-white/20 rounded-lg w-full bg-transparent text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none neon-glow"
          />
          <button
            onClick={handleFetchCollections}
            disabled={loading}
            className="p-2 bg-blue-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-blue-400 shadow-[0_0_10px_#00ff00] hover:shadow-[0_0_15px_#00ff00] mt-2"
          >
            {loading ? "Loading..." : "Fetch Collections"}
          </button>
        </div>

        {collections.length > 0 && (
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-2 text-white glow">Select Collection:</label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="p-2 border border-white/20 rounded-lg w-full bg-transparent text-white focus:ring-2 focus:ring-blue-500 focus:outline-none neon-glow"
            >
              <option value="">Select a collection</option>
              {collections.map((collection, index) => (
                <option key={index} value={collection} className="bg-gray-900">
                  {collection}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selectedSatellite || !dbName || !selectedCollection}
          className="p-2 bg-green-500/50 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-transparent transition w-full md:w-auto neon-glow border border-green-400 shadow-[0_0_10px_#00ff00] hover:shadow-[0_0_15px_#00ff00]"
        >
          Confirm
        </button>

        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-green-500/50 backdrop-blur-md text-white p-6 rounded-lg shadow-lg text-center neon-glow border border-green-400"
            >
              <h2 className="text-2xl font-bold mb-4">Confirmation</h2>
              <p className="text-lg mb-2">Satellite: {selectedSatellite?.name}</p>
              <p className="text-lg mb-2">Database: {dbName}</p>
              <p className="text-lg mb-4">Collection: {selectedCollection}</p>
              <button
                onClick={handleRedirect}
                className="p-2 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition shadow-md neon-glow border border-white/20"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SatelliteSelectionPage;