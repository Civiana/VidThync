import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import 'tailwindcss/index.css';
import './App.css';
import { useEffect, useRef, useState } from 'react';
import { startServer } from 'src/signalingServer/functionStarter.js';
import {
  createYEnvironment,
  destroyYEnvironment,
  type YEnvironment,
} from 'src/yjsRTC/setup';

import { Button } from '@/components/ui/button';

function Hello() {
  const [timePressed, setTimePressed] = useState(0);

  // Yjs environment ref so we don't re-create it on every render
  const envRef = useRef<YEnvironment | null>(null);
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    // 1) Choose a roomName - peers must use the same name to sync
    const roomName = 'videothync-demo';

    // 2) Ensure your signaling server is running (see button below)
    //    If you prefer a public one temporarily, replace with 'wss://signaling.yjs.dev'
    const signalingUrl = 'ws://localhost:4444';

    // 3) Create Yjs doc + persistence + webrtc
    envRef.current = createYEnvironment(roomName, signalingUrl);

    // 4) Bind a shared Y.Text to the textarea
    const ytext = envRef.current.ydoc.getText('shared-text');

    // Initialize from current doc content (might come from IndexedDB)
    setTextValue(ytext.toString());

    const observer = () => {
      setTextValue(ytext.toString());
    };
    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
      if (envRef.current) destroyYEnvironment(envRef.current);
      envRef.current = null;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const env = envRef.current;
    if (!env) return;
    const ytext = env.ydoc.getText('shared-text');

    // Naive binding for demo: replace full content each time
    // For production, bind granular edits using a proper editor binding
    env.ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, e.target.value);
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black min-w-0 min-h-0 overflow-hidden p-4 gap-3">
      <p className="bg-blue-950 text-white p-2 rounded">
        Hi nice people {timePressed}
      </p>
      <Button onClick={() => setTimePressed(timePressed + 1)} variant="outline">
        Button
      </Button>
      <Button onClick={startServer} variant="outline">
        Start signaling server for WebRTC
      </Button>

      <div className="flex flex-col gap-2 mt-4">
        <p className="text-white">
          Shared Text (persisted via IndexedDB + synced via WebRTC):
        </p>
        <textarea
          className="w-full text-white h-48 p-2 rounded"
          value={textValue}
          onChange={onChange}
          placeholder="Type here. Open a second window or machine with the same room to see live sync."
        />
      </div>
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
