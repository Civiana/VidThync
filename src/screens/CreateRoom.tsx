import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router';
import {
  createOrUpdateFolderSyncThing,
  fetchDeviceID,
  addDevicesID,
} from 'src/syncthing/API';
import TestConnection from 'src/components/TestConnection';
import {
  createYEnvironment,
  // destroyYEnvironment,
  type YEnvironment,
} from 'src/yjsRTC/setup';
import Joins from './Joins';

function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [isServerStarting, setIsServerStarting] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [filePath, setFilePath] = useState('');
  const envRef = useRef<YEnvironment | null>(null);
  const [env, setEnv] = useState(false);
  const [deviceID, setDeviceID] = useState('');
  const [signalingPort, setSignalingPort] = useState('4444');

  const navigate = useNavigate();

  const handlePickFolder = async () => {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setFilePath(selectedPath);
    }
  };

  // useEffect(() => {
  //   if (envRef.current) {
  //     const yarray = envRef.current.ydoc.getArray('IDs');
  //     yarray.observe(() => {
  //       const itemsToProcess: string[] = [];
  //       yarray.forEach((item: string) => {
  //         itemsToProcess.push(item);
  //       });

  //       // Process each item and clear the array
  //       itemsToProcess.forEach((item) => {
  //         addDevicesID('/config', item);
  //       });

  //       // Clear the entire array after processing all items
  //       yarray.delete(0, yarray.length);
  //     });
  //   }
  // }, []);

  useEffect(() => {
    async function deviceFetch() {
      setDeviceID(await fetchDeviceID());
    }
    deviceFetch();
  }, []);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name');
      return;
    }
    await createOrUpdateFolderSyncThing('/config/folders', roomName, filePath);
    setIsServerStarting(true);
    try {
      window.electronAPI.startServer();

      // eslint-disable-next-line no-console
      console.log(`Created room: ${roomName} on ws://localhost:4444`);
      envRef.current = createYEnvironment(roomName, 'localhost', signalingPort);
      setEnv(true);
      // eslint-disable-next-line no-alert
      alert(
        `Room "${roomName}" created successfully! Server running on localhost:4444`,
      );
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Failed to start signaling server');
      console.error('Error starting server:', error);
    } finally {
      setIsServerStarting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-700 text-white p-8 overflow-auto">
      <Button onClick={() => navigate(-1)}>&lt;</Button>

      <div className="text-center mb-8 ">
        <h1 className="text-3xl font-bold mb-2">VideoThync Rooms</h1>
        <p className="text-gray-400">
          Create a new room or join an existing one
        </p>
        <p className="text-gray-400">Your Device ID: {deviceID}</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Create a New Room</h2>
        <div>
          <Label className="block text-sm font-medium mb-2">Room Name</Label>
          <Input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
            className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium mb-2">Host port</Label>
          <Input
            type="text"
            value={signalingPort}
            onChange={(e) => setSignalingPort(e.target.value)}
            placeholder="4444"
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the port of the your signaling server (default port: 4444)
          </p>
        </div>

        <div>
          <Label className="block text-sm font-medium mb-2">
            Path to folder
          </Label>
          <Button onClick={handlePickFolder} className="mb-2">
            Browse
          </Button>
          <Input
            id="folder"
            value={filePath}
            placeholder="Folder Path"
            readOnly
            className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <Label className="block text-sm font-medium mb-2">
            Description (Optional)
          </Label>
          <Input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Room description"
            className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="bg-gray-800 p-4 rounded-md">
          <p className="text-sm text-gray-300 mb-2">
            <strong>Note:</strong> Creating a room will start a local signaling
            server on port 4444. Others can connect to your room using your IP
            address.
          </p>
          <p className="text-xs text-gray-400">
            Signaling Server URL: ws://localhost:4444 (or ws://YOUR_IP:4444 for
            remote connections)
          </p>
        </div>

        <Button
          onClick={handleCreateRoom}
          disabled={isServerStarting || !roomName.trim()}
          className="w-full"
          size="lg"
        >
          {isServerStarting
            ? 'Starting Server...'
            : 'Create Room & Start Server'}
        </Button>
        <div>
          {envRef.current?.ydoc && (
            <Joins ydoc={envRef.current?.ydoc ?? null} roomName={roomName} />
          )}
        </div>
      </div>
      <div className="text-center mt-8 text-gray-500 text-sm">
        {(envRef.current?.ydoc || env) && (
          <TestConnection doc={envRef.current?.ydoc ?? null} />
        )}
      </div>
    </div>
  );
}

export default CreateRoom;
