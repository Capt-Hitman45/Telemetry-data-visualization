// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SatelliteSelectionPage from './pages/SelectionPage';
import UploadPage from './pages/UploadPage';
import VisualizationPage from './pages/VisualizationPage';
import './index.css';
import './Global.css';



const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/selection" element={<SatelliteSelectionPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/visualization" element={<VisualizationPage />} />
      </Routes>
    </Router>
  );
};

export default App;

