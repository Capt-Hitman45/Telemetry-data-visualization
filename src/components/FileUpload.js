import React, { useState } from 'react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';

const FileUpload = () => {
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
        try {
          if (uploadedFile.name.endsWith('.json')) {
            const parsedData = JSON.parse(content);
            console.log('📂 Parsed JSON Data:', parsedData); // ✅ Debugging Log
            setData(Array.isArray(parsedData) ? parsedData : [parsedData]); // Ensure array
          } else if (uploadedFile.name.endsWith('.csv')) {
            Papa.parse(content, {
              header: true,
              dynamicTyping: true,
              complete: (result) => {
                console.log('📂 Parsed CSV Data:', result.data); // ✅ Debugging Log
                setData(result.data.length > 0 ? result.data : []);
              },
            });
          }
        } catch (error) {
          console.error('❌ Error parsing file:', error);
          setData([]);
        }
      };
      reader.readAsText(uploadedFile);
    }
  };

  const handleNext = () => {
    console.log('📤 Sending data to VisualizationPage:', data); // ✅ Debugging Log
    if (data.length > 0) {
      setTimeout(() => { // ✅ Ensure state is updated before navigation
        navigate('/visualization', { state: { data } });
      }, 100);
    } else {
      alert('⚠ No valid data found in the file. Please upload a valid file.');
    }
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

export default FileUpload;
