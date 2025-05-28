import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import ChatInterface from './components/chat/ChatInterface';
import ServiceMap from './components/map/ServiceMap';
import Dashboard from './components/dashboard/Dashboard';
import Login from './components/auth/Login';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ChatInterface />} />
            <Route path="/map" element={<ServiceMap />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/\" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;