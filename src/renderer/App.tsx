import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import 'tailwindcss/index.css';
import './App.css';
import { useState } from 'react';
import { startServer } from 'src/signalingServer/functionStarter.js';

import { Button } from '@/components/ui/button';

function Hello() {
  const [timePressed, setTimePressed] = useState(0);
  return (
    <div className="flex flex-col h-screen w-screen bg-black min-w-0 min-h-0 overflow-hidden">
      <p className="bg-blue-950">Hi nice people {timePressed}</p>
      <Button onClick={() => setTimePressed(timePressed + 1)} variant="outline">
        Button
      </Button>
      <Button onClick={startServer} variant="outline">
        Start signaling server for WebRTC
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
