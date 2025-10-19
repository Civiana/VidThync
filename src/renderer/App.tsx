import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import 'tailwindcss/index.css';
import './App.css';
import { useEffect, useRef, useState } from 'react';
import {
  createYEnvironment,
  destroyYEnvironment,
  type YEnvironment,
} from 'src/yjsRTC/setup';
import { useNavigate } from 'react-router';

import {
  createOrUpdateFolderSyncThing,
  fetchSyncthingData,
  fetchDeviceID,
  addDevicesID,
} from 'src/syncthing/API';

import { Button } from '@/components/ui/button';
import Rooms from 'src/screens/Rooms';
import Join from 'src/screens/Joins';
import { error } from 'console';
import { Input } from '@/components/ui/input';
import { URL } from 'url';
import { get } from 'http';

function Hello() {
  const [timePressed, setTimePressed] = useState(0);

  // Yjs environment ref so we don't re-create it on every render
  const envRef = useRef<YEnvironment | null>(null);
  const [data, setData] = useState('');
  const [textValue, setTextValue] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [textValue1, setTextValue1] = useState('');
  let navigate = useNavigate();
  const [labels, setLabels] = useState('');
  async function handleCreateOrUpdate(endpoint: string, labels: string) {
    const response = await createOrUpdateFolderSyncThing(endpoint, labels);
    setData(response);
  }

  async function handleFetchingData(endpoint: string) {
    const response = await fetchSyncthingData(endpoint);
    setData(response);
  }

  async function handleAddDevices(endpoint: string, deviceID: string) {
    setDeviceID(await addDevicesID(endpoint, deviceID));
  }

  useEffect(() => {
    async function shareFolder(deviseID: string) {
      const response = await window.electronAPI.syncthingFetch(
        'http://localhost:8384/rest/config/folders/0vxf2-iua',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'RsTsp5wUXr9XgSLnMRfgvP5mAMNLyTCK',
          },
        },
      );

      if (!response.success) {
        console.error('Failed to fetch folder config:', response.error);
        return;
      }

      const config = response.data;

      const alreadyExist = config.devices.some(
        (device: any) => deviceID == deviseID,
      );
      if (!alreadyExist) {
        config.devices.push({
          deviceID: deviseID,
        });
      }
      const res = await window.electronAPI.syncthingFetch(
        'http://localhost:8384/rest/config/folders/0vxf2-iua',
        {
          method: 'PUT',
          headers: {
            'X-API-Key': 'RsTsp5wUXr9XgSLnMRfgvP5mAMNLyTCK',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        },
      );

      if (res.success) {
        console.log('Folder shared successfully:', config);
      } else {
        console.error('Failed to update folder config:', res.error);
      }
    }
    shareFolder(
      'ENCR43C-RXJIIBD-HAKR4XZ-CU2YJU5-FIFA5BH-K6RVGFF-ZM6NP7B-3GSTLA5',
    );
    // 1) Choose a roomName - peers must use the same name to sync
    const roomName = 'videothync-demo';
    // 2) Ensure your signaling server is running (see button below)
    //    If you prefer a public one temporarily, replace with 'wss://signaling.yjs.dev'
    const signalingUrl = 'ws://localhost:4444';

    // 3) Create Yjs doc + persistence + webrtc
    envRef.current = createYEnvironment(roomName, signalingUrl);

    // 4) Use Y.Map instead of Y.Text to store strings
    const ymap = envRef.current.ydoc.getMap('shared-data');
    // Initialize from current doc content (might come from IndexedDB)
    // Using a specific key like 'textContent' to store our string
    const initialText = ymap.get('textContent') || '';
    setTextValue(initialText);

    const observer = (event: any) => {
      // Listen for changes to the map
      if (event.keysChanged.has('textContent')) {
        const newText = ymap.get('textContent') || '';
        setTextValue(newText);
      }
      if (event.keysChanged.has('textContent1')) {
        const newText = ymap.get('textContent1') || '';
        setTextValue1(newText);
      }
    };
    ymap.observe(observer);

    return () => {
      ymap.unobserve(observer);
      if (envRef.current) destroyYEnvironment(envRef.current);
      envRef.current = null;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const env = envRef.current;
    if (!env) return;

    const ymap = env.ydoc.getMap('shared-data');

    ymap.set(e.target.title, e.target.value);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-600 min-w-0 min-h-0 overflow-hidden p-4 gap-3">
      <p className="bg-blue-950 text-white p-2 rounded">
        Hi nice people {timePressed}
      </p>
      <Button onClick={() => setTimePressed(timePressed + 1)} variant="outline">
        Button
      </Button>
      <Button
        onClick={() => {
          navigate('/room');
        }}
        variant="outline"
        className="bg-green-500 hover:bg-green-600 hover:text-white text-white border border-green-700 px-4 py-2 rounded "
      >
        connect to room
      </Button>
      <Button onClick={window.electronAPI.startServer} variant="outline">
        Start signaling server for WebRTC
      </Button>

      <Button
        onClick={async () => {
          await handleFetchingData('/config/folders');
          console.log(data);
        }}
        variant="outline"
      >
        get folders json
      </Button>
      <p className="text-yellow-300">Add Device</p>
      <input
        className="w-full text-white h-48 p-2 rounded border-width 45px border-amber-500"
        value={deviceID}
        placeholder="Device Number"
        type="text"
        onChange={(event) => {
          setDeviceID(event.target.value);
        }}
      />

      <Button
        onClick={async () => {
          await handleAddDevices('/config', `${deviceID}`);
        }}
        variant="outline"
      >
        Add Device
      </Button>

      <Input id="video" type="file" />

      <div className="flex flex-col gap-2 mt-4">
        <p className="text-white">
          Shared Text (persisted via IndexedDB + synced via WebRTC):
        </p>
        <textarea
          className="w-full text-white h-48 p-2 rounded"
          title="textContent"
          value={textValue}
          onChange={onChange}
          placeholder="Type here. Open a second window or machine with the same room to see live sync."
        />
        <textarea
          className="w-full text-white h-48 p-2 rounded"
          title="textContent1"
          value={textValue1}
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
        <Route path="/room" element={<Rooms />} />
      </Routes>
    </Router>
  );
}
