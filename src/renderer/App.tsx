import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router';
import 'tailwindcss/index.css';
import './App.css';

import { Button } from '@/components/ui/button';
import Rooms from 'src/screens/Rooms';
import { Input } from '@/components/ui/input';
import {
  saveSyncthingApiKey,
  loadSyncthingApiKey,
} from 'src/utils/apiKeyStorage';

function Hello() {
  const navigate = useNavigate();
  const [syncThingApi, setSyncThingApi] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load API key from IndexedDB on mount
  useEffect(() => {
    async function loadApiKey() {
      try {
        const storedKey = await loadSyncthingApiKey();
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

  // Save API key to IndexedDB whenever it changes
  useEffect(() => {
    if (syncThingApi && !isLoading) {
      saveSyncthingApiKey(syncThingApi).catch((error) => {
        console.error('Failed to save API key:', error);
      });
    }
  }, [syncThingApi, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-600">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-600 min-w-0 min-h-0 overflow-hidden p-4 gap-3">
      <Input
        className="text-white placeholder:text-black"
        placeholder="You need to Get the API key from syncthing and add it here before you can connect to a room"
        value={syncThingApi}
        onChange={(e) => setSyncThingApi(e.target.value)}
      />
      <Button
        onClick={() => {
          navigate('/room');
        }}
        disabled={syncThingApi === ''}
        variant="outline"
        className="bg-green-500 hover:bg-green-600 hover:text-white text-white border border-green-700 px-4 py-2 rounded "
      >
        start to connect to a room
      </Button>
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
        const storedKey = await loadSyncthingApiKey();
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
      <div className="flex items-center justify-center h-screen w-screen bg-gray-600">
        <p className="text-white">Checking authorization...</p>
      </div>
    );
  }

  return isAuthorized ? children : null;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
        <Route
          path="/room"
          element={
            <ProtectedRoute>
              <Rooms />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
