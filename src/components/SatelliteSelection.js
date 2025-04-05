// src/components/SatelliteSelection.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SatelliteSelection = ({ onNext }) => {
  const [satellites, setSatellites] = useState([]);
  const [selectedSatellite, setSelectedSatellite] = useState('');
  const [subsystems, setSubsystems] = useState([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState('');

  // Load mock data
  useEffect(() => {
    axios.get('/mock_data.json')
      .then(response => setSatellites(response.data.satellites))
      .catch(error => console.error(error));
  }, []);

  // Update subsystems when satellite is selected
  useEffect(() => {
    if (selectedSatellite) {
      const satellite = satellites.find(sat => sat.name === selectedSatellite);
      setSubsystems(satellite ? satellite.subsystems : []);
    }
  }, [selectedSatellite, satellites]);

  return (
    <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Select Satellite and Subsystem</h1>

      {/* Satellite Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Satellite</label>
        <select
          value={selectedSatellite}
          onChange={(e) => setSelectedSatellite(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="">Select a satellite</option>
          {satellites.map(satellite => (
            <option key={satellite.name} value={satellite.name}>
              {satellite.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subsystem Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Subsystem</label>
        <select
          value={selectedSubsystem}
          onChange={(e) => setSelectedSubsystem(e.target.value)}
          className="p-2 border border-gray-300 rounded"
          disabled={!selectedSatellite}
        >
          <option value="">Select a subsystem</option>
          {subsystems.map(subsystem => (
            <option key={subsystem.name} value={subsystem.name}>
              {subsystem.name}
            </option>
          ))}
        </select>
      </div>

      {/* Next Button */}
      <button
        onClick={() => onNext(selectedSatellite, selectedSubsystem)}
        disabled={!selectedSubsystem}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        Next
      </button>
    </div>
  );
};

export default SatelliteSelection;