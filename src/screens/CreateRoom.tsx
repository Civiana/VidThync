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
  const [signalingPort, setSignalingPort] = useState('49999');
  const [savedHostRooms, setSavedHostRooms] = useState<
    Awaited<ReturnType<typeof listSavedRoomConfigs>>
  >([]);
  const [isLoadingSavedRooms, setIsLoadingSavedRooms] = useState(true);

  const navigate = useNavigate();
  const {
    connect,
    disconnect,
    saveRoomConfig,
    listSavedRoomConfigs,
    state,
    isConnected,
    getYDoc,
  } = useYjs();

  const refreshSavedRooms = async () => {
    try {
      setIsLoadingSavedRooms(true);
      const rooms = await listSavedRoomConfigs();
      setSavedHostRooms(rooms.filter((room) => room.isHost));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[CreateRoom] Failed to load saved rooms:', error);
    } finally {
      setIsLoadingSavedRooms(false);
    }
  };

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
    refreshSavedRooms();
  }, []);

  // Cleanup on unmount - offer to disconnect
  useEffect(() => {
    return () => {
      // Note: We don't auto-disconnect here to allow connection to persist
      // User must explicitly disconnect via the debug panel or disconnect button
    };
  }, []);

  const createRoomWithConfig = async (params: {
    roomNameValue: string;
    filePathValue: string;
    signalingPortValue: string;
    descriptionValue: string;
  }) => {
    const { roomNameValue, filePathValue, signalingPortValue, descriptionValue } =
      params;

    if (!roomNameValue.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name');
      return;
    }

    if (!filePathValue.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please select a folder path');
      return;
    }

    // Validate port number
    const portNum = parseInt(signalingPortValue, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      // eslint-disable-next-line no-alert
      alert('Please enter a valid port number (1-65535)');
      return;
    }

    // Check if already connected to a different room
    if (isConnected && state.roomName !== roomNameValue) {
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
      const roomKey = `${roomNameValue + deviceID}`;

      // Setup Syncthing folder with deterministic folder ID (roomKey)
      await createOrUpdateFolderSyncThing(
        '/config/folders',
        roomKey,
        filePathValue,
        roomKey,
      );

      // Start the signaling server with the selected port
      try {
      window.electronAPI.startServer(signalingPortValue);
    } catch (error) {
      console.error('[CreateRoom] Failed to start signaling server:', error);
      alert(
        `Failed to start signaling server on port ${signalingPortValue}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

      // eslint-disable-next-line no-console
      console.log(
        `[CreateRoom] Starting signaling server on port ${signalingPortValue}`,
      );

      // Wait a bit for server to start
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000);
      });

      // Connect to the room using the connection manager
      await connect({
        roomName: roomKey,
        signalingUrl: 'localhost',
        signalingPort: signalingPortValue,
        isHost: true,
      });

      await saveRoomConfig({
        isHost: true,
        roomName: roomNameValue.trim(),
        roomKey,
        signalingUrl: 'localhost',
        signalingPort: signalingPortValue,
        filePath: filePathValue,
        deviceID,
        description: descriptionValue.trim(),
        hostDeviceId: '',
        hostPort: '',
        connectionMode: '',
        createdAt: new Date().toISOString(),
      });

      await refreshSavedRooms();

      // eslint-disable-next-line no-console
      console.log(
        `[CreateRoom] Successfully created and connected to room: ${roomNameValue}`,
      );

      // eslint-disable-next-line no-alert
      alert(
        `Room "${roomNameValue}" created successfully! Server running on localhost:${signalingPortValue}`,
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

  const handleCreateRoom = async () => {
    await createRoomWithConfig({
      roomNameValue: roomName,
      filePathValue: filePath,
      signalingPortValue: signalingPort,
      descriptionValue: customDescription,
    });
  };

  const handleCreateSavedRoom = async (
    savedRoom: (typeof savedHostRooms)[number],
  ) => {
    setRoomName(savedRoom.roomName);
    setFilePath(savedRoom.filePath);
    setSignalingPort(savedRoom.signalingPort);
    setCustomDescription(savedRoom.description);

    await createRoomWithConfig({
      roomNameValue: savedRoom.roomName,
      filePathValue: savedRoom.filePath,
      signalingPortValue: savedRoom.signalingPort,
      descriptionValue: savedRoom.description,
    });
  };

  const handleDisconnect = async () => {
    try {
      if (state.isHost && window.electronAPI?.stopServer) {
        window.electronAPI.stopServer();
      }
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
            type="number"
            min="1"
            max="65535"
            value={signalingPort}
            onChange={(e) => setSignalingPort(e.target.value)}
            placeholder="49999"
            disabled={isServerStarting}
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the port of your signaling server (default: 4999, range:
            1-65535)
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
            <FilesDisplay roomName={`${roomName + deviceID}`} />
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Saved Host Rooms</h3>
          {isLoadingSavedRooms ? (
            <p className="text-sm text-gray-400">Loading saved rooms...</p>
          ) : savedHostRooms.length === 0 ? (
            <p className="text-sm text-gray-400">No saved host rooms yet.</p>
          ) : (
            <div className="space-y-3">
              {savedHostRooms.map((savedRoom) => (
                <div
                  key={savedRoom.roomKey}
                  className="rounded-lg border border-gray-600 bg-gray-800 p-4"
                >
                  <p className="font-semibold text-white">{savedRoom.roomName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Port: {savedRoom.signalingPort}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Folder: {savedRoom.filePath}
                  </p>
                  {savedRoom.description && (
                    <p className="text-xs text-gray-300 mt-1">
                      {savedRoom.description}
                    </p>
                  )}
                  <Button
                    className="mt-3"
                    onClick={() => handleCreateSavedRoom(savedRoom)}
                    disabled={isServerStarting || state.status === 'connecting'}
                  >
                    Create
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Use the debug panel (top-right) to monitor your connection status</p>
      </div>
    </div>
  );
}

export default CreateRoom;
