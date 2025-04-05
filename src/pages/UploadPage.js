// src/pages/UploadPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        if (uploadedFile.name.endsWith('.json')) {
          setData(JSON.parse(content));
        } else if (uploadedFile.name.endsWith('.csv')) {
          Papa.parse(content, {
            header: true,
            dynamicTyping: true,
            complete: (result) => setData(result.data),
          });
        }
      };
      reader.readAsText(uploadedFile);
    }
  };

  const handleNext = () => {
    navigate('/visualization', { state: { data } });
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Upload Telemetry Data</h1>

      {/* File Upload */}
      <input
        type="file"
        accept=".json,.csv"
        onChange={handleFileChange}
        className="mb-4"
      />

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={!file}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        Next
      </button>
    </div>
  );
};

export default UploadPage;