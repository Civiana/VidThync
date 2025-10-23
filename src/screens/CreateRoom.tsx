import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router';
import {
  createOrUpdateFolderSyncThing,
  fetchDeviceID,
} from 'src/syncthing/API';
import { useYjs } from 'src/yjsRTC/YjsContext';
import Joins from './Joins';
import FilesDisplay from '../components/FilesDisplay';

function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [isServerStarting, setIsServerStarting] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [filePath, setFilePath] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [signalingPort, setSignalingPort] = useState('4444');

  const navigate = useNavigate();
  const { connect, disconnect, state, isConnected, getYDoc } = useYjs();

  const handlePickFolder = async () => {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setFilePath(selectedPath);
    }
  };

  useEffect(() => {
    async function deviceFetch() {
      setDeviceID(await fetchDeviceID());
    }
    deviceFetch();
  }, []);

  // Cleanup on unmount - offer to disconnect
  useEffect(() => {
    return () => {
      // Note: We don't auto-disconnect here to allow connection to persist
      // User must explicitly disconnect via the debug panel or disconnect button
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name');
      return;
    }

    if (!filePath.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please select a folder path');
      return;
    }

    // Check if already connected to a different room
    if (isConnected && state.roomName !== roomName) {
      // eslint-disable-next-line no-alert
      const shouldDisconnect = window.confirm(
        `You are already connected to room "${state.roomName}". Do you want to disconnect and create a new room?`,
      );
      if (!shouldDisconnect) {
        return;
      }
      await disconnect();
    }

    setIsServerStarting(true);

    try {
      // Setup Syncthing folder
      await createOrUpdateFolderSyncThing(
        '/config/folders',
        `${roomName + deviceID}`,
        filePath,
      );

      // Start the signaling server
      window.electronAPI.startServer();

      // eslint-disable-next-line no-console
      console.log(
        `[CreateRoom] Starting signaling server on port ${signalingPort}`,
      );

      // Wait a bit for server to start
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000);
      });

      // Connect to the room using the connection manager
      await connect({
        roomName: `${roomName + deviceID}`,
        signalingUrl: 'localhost',
        signalingPort,
        isHost: true,
      });

      // eslint-disable-next-line no-console
      console.log(
        `[CreateRoom] Successfully created and connected to room: ${roomName}`,
      );

      // eslint-disable-next-line no-alert
      alert(
        `Room "${roomName}" created successfully! Server running on localhost:${signalingPort}`,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[CreateRoom] Error creating room:', error);
      // eslint-disable-next-line no-alert
      alert(
        `Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsServerStarting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      // eslint-disable-next-line no-alert
      alert('Disconnected from room successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[CreateRoom] Error disconnecting:', error);
      // eslint-disable-next-line no-alert
      alert('Failed to disconnect');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-700 text-white p-8 overflow-auto">
      <Button onClick={() => navigate(-1)}>&lt; Back</Button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">VideoThync Rooms</h1>
        <p className="text-gray-400">
          Create a new room or join an existing one
        </p>
        <p className="text-gray-400">Your Device ID: {deviceID}</p>
      </div>

      {/* Connection Status Banner */}
      {isConnected && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-500 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-400">
                Currently Connected to: {state.roomName}
              </p>
              <p className="text-sm text-gray-400">
                Peers: {state.peersConnected} | Role:{' '}
                {state.isHost ? 'Host' : 'Client'}
              </p>
            </div>
            <Button onClick={handleDisconnect} variant="destructive" size="sm">
              Disconnect
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Create a New Room</h2>

        <div>
          <Label className="block text-sm font-medium mb-2">Room Name</Label>
          <Input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
            disabled={isServerStarting}
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
            disabled={isServerStarting}
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the port of your signaling server (default port: 4444)
          </p>
        </div>

        <div>
          <Label className="block text-sm font-medium mb-2">
            Path to folder
          </Label>
          <Button
            onClick={handlePickFolder}
            className="mb-2"
            disabled={isServerStarting}
          >
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
            disabled={isServerStarting}
            className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="bg-gray-800 p-4 rounded-md">
          <p className="text-sm text-gray-300 mb-2">
            <strong>Note:</strong> Creating a room will start a local signaling
            server on port {signalingPort}. Others can connect to your room
            using your IP address.
          </p>
          <p className="text-xs text-gray-400">
            Signaling Server URL: ws://localhost:{signalingPort} (or
            ws://YOUR_IP:{signalingPort} for remote connections)
          </p>
        </div>

        <Button
          onClick={handleCreateRoom}
          disabled={
            isServerStarting ||
            !roomName.trim() ||
            !filePath.trim() ||
            state.status === 'connecting'
          }
          className="w-full"
          size="lg"
        >
          {(() => {
            if (isServerStarting) return 'Starting Server...';
            if (state.status === 'connecting') return 'Connecting...';
            if (isConnected && state.roomName === roomName)
              return 'Already Connected';
            return 'Create Room & Start Server';
          })()}
        </Button>

          
        {/* Show Joins component when connected */}
        {isConnected && getYDoc() !== null && (
          <div className="mt-6">
            <Joins ydoc={getYDoc()!} roomName={`${roomName + deviceID}`} />
            <FilesDisplay roomName={`${roomName + deviceID}`}/>
          </div>
        )}
      </div>

      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Use the debug panel (top-right) to monitor your connection status</p>
      </div>
    </div>
  );
}

export default CreateRoom;
