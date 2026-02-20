import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import GlobalAudio from './components/GlobalAudio';

const socket = io("https://npat-server-u2e9.onrender.com");

function App() {
  return (
    <Router>
      <div className="App font-sans bg-gray-100 min-h-screen">
        <GlobalAudio />
        <Routes>
          <Route path="/" element={<Home socket={socket} />} />
          <Route path="/lobby/:roomId" element={<Lobby socket={socket} />} />
          <Route path="/game/:roomId" element={<GameRoom socket={socket} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;