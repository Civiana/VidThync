import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router';
import 'tailwindcss/index.css';
import './App.css';
import CreateRoom from 'src/screens/CreateRoom';
import ConnectToRoom from 'src/screens/ConnectToRoom';
import Settings from 'src/screens/Settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getSyncthingApiKey,
  setSyncthingApiKey,
} from 'src/utils/state';
import { fetchDeviceID } from 'src/syncthing/API';
import { Settings as SettingsIcon } from 'lucide-react';

function Hello() {
  const navigate = useNavigate();
  const [syncThingApi, setSyncThingApi] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deviceID, setDeviceID] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getDeviceID = async () => {
    try {
      const id = await fetchDeviceID();
      setDeviceID(id);
      setError(null);
    } catch (e) {
      setError(`Error: ${(e as Error).message}`);
      setDeviceID('');
    }
  };

  // Load API key from electron-store on mount
  useEffect(() => {
    async function loadApiKey() {
      try {
        const storedKey = await getSyncthingApiKey();
        if (storedKey) {
          setSyncThingApi(storedKey);
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadApiKey();
  }, []);

  // Save API key to electron-store whenever it changes
  useEffect(() => {
    if (syncThingApi && !isLoading) {
      setSyncthingApiKey(syncThingApi)
        .catch((e) => {
          console.error('Failed to save API key:', e);
        })
        .then(() => {
          getDeviceID();
        });
    }
  }, [syncThingApi, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white p-8 gap-4 overflow-auto">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">VideoThync</h1>
          <Button
            onClick={() => navigate('/settings')}
            variant="outline"
            className="flex items-center gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
          >
            <SettingsIcon className="w-4 h-4" /> Settings
          </Button>
        </div>

        <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
          <label className="block text-sm font-medium text-gray-300">
            Syncthing API Key
          </label>
          <Input
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            placeholder="Get API Key from Syncthing Web GUI (Actions -> Settings -> API Key)"
            value={syncThingApi}
            onChange={(e) => setSyncThingApi(e.target.value)}
          />

          {error && (
            <p className="text-red-400 text-sm">
              Could not reach Syncthing at localhost:8384. Make sure Syncthing is running and API key is correct. ({error})
            </p>
          )}

          {deviceID && (
            <p className="text-green-400 text-sm font-mono truncate">
              ✓ Connected to Syncthing. Device ID: {deviceID}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Button
              onClick={() => navigate('/createRoom')}
              disabled={syncThingApi === '' || error !== null}
              className="bg-green-600 hover:bg-green-700 text-white py-3 font-semibold"
              size="lg"
            >
              Create Room (Host)
            </Button>
            <Button
              onClick={() => navigate('/connectRoom')}
              disabled={syncThingApi === '' || error !== null}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold"
              size="lg"
            >
              Connect to Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkApiKey() {
      try {
        const storedKey = await getSyncthingApiKey();
        if (!storedKey || storedKey === '') {
          navigate('/');
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Failed to check API key:', error);
        navigate('/');
      } finally {
        setIsChecking(false);
      }
    }
    checkApiKey();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900 text-white">
        <p>Checking authorization...</p>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
        <Route
          path="/createRoom"
          element={
            <ProtectedRoute>
              <CreateRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connectRoom"
          element={
            <ProtectedRoute>
              <ConnectToRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
