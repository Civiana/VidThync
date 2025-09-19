import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Dexie, { Table } from 'dexie';
import TestConnection from 'src/components/TestConnection';
import {
  createOrUpdateFolderSyncThing,
  fetchDeviceID,
} from 'src/syncthing/API';
import {
  createYEnvironment,
  destroyYEnvironment,
  type YEnvironment,
} from 'src/yjsRTC/setup';
// IndexedDB schema for storing room history
interface RoomRecord {
  id?: number;
  name: string;
  signalingUrl: string;
  lastConnected: Date;
  description?: string;
}

class RoomDatabase extends Dexie {
  rooms!: Table<RoomRecord>;

  constructor() {
    super('VideoThyncRooms');
    this.version(1).stores({
      rooms: '++id, name, signalingUrl, lastConnected',
    });
  }
}

const db = new RoomDatabase();

function Rooms() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [signalingUrl, setSignalingUrl] = useState('ws://localhost:4444');
  const [pastRooms, setPastRooms] = useState<RoomRecord[]>([]);
  const [isServerStarting, setIsServerStarting] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [filePath, setFilePath] = useState('');
  const envRef = useRef<YEnvironment | null>(null);
  let navigate = useNavigate();

  const loadPastRooms = async () => {
    try {
      const rooms = await db.rooms.orderBy('lastConnected').reverse().toArray();
      setPastRooms(rooms);
    } catch (error) {
      // Silent error handling for loading rooms
    }
  };

  const handlePickFolder = async () => {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setFilePath(selectedPath);
    }
  };

  // Load past rooms from IndexedDB
  useEffect(() => {
    loadPastRooms();
    async function deviceFetch() {
      setDeviceID(await fetchDeviceID());
    }
    deviceFetch();
  }, []);

  const saveRoomToHistory = async (
    name: string,
    url: string,
    description?: string,
  ) => {
    try {
      // Check if room already exists
      const existingRoom = await db.rooms
        .where({ name, signalingUrl: url })
        .first();

      if (existingRoom) {
        // Update existing room's last connected time
        await db.rooms.update(existingRoom.id!, { lastConnected: new Date() });
      } else {
        // Add new room
        await db.rooms.add({
          name,
          signalingUrl: url,
          lastConnected: new Date(),
          description,
        });
      }

      // Reload the list
      await loadPastRooms();
    } catch (error) {
      // Silent error handling for saving room
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name');
      return;
    }
    await createOrUpdateFolderSyncThing('/config/folders', roomName, filePath);
    setIsServerStarting(true);
    try {
      // Start the signaling server
      window.electronAPI.startServer();

      // Save to history
      await saveRoomToHistory(
        roomName,
        'ws://localhost:4444',
        customDescription || 'Local room',
      );

      // Here you would typically navigate to the room or initialize the WebRTC connection
      // eslint-disable-next-line no-console
      console.log(`Created room: ${roomName} on ws://localhost:4444`);
      envRef.current = createYEnvironment(roomName, 'ws://localhost:4444');
      // eslint-disable-next-line no-alert
      alert(
        `Room "${roomName}" created successfully! Server running on localhost:4444`,
      );
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Failed to start signaling server');
    } finally {
      setIsServerStarting(false);
    }
  };

  const handleJoinRoom = async (name: string, url: string) => {
    try {
      // Save to history (updates last connected time)
      await saveRoomToHistory(name, url);

      // Here you would typically connect to the room
      // eslint-disable-next-line no-console
      console.log(`Connecting to room: ${name} at ${url}`);
      // eslint-disable-next-line no-alert
      alert(`Connecting to room "${name}" at ${url}`);
      envRef.current = createYEnvironment(roomName, url);
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Failed to connect to room');
    }
  };

  const handleConnectToCustomRoom = () => {
    if (!roomName.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name');
      return;
    }

    if (!signalingUrl.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter a signaling server URL');
      return;
    }

    handleJoinRoom(roomName, signalingUrl);
  };

  const deleteRoom = async (roomId: number) => {
    try {
      await db.rooms.delete(roomId);
      await loadPastRooms();
    } catch (error) {
      // Silent error handling for deleting room
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Button onClick={() => navigate(-1)}>&lt;</Button>
          <h1 className="text-3xl font-bold mb-2">VideoThync Rooms</h1>
          <p className="text-gray-400">
            Create a new room or join an existing one
          </p>
          <p className="text-gray-400">Your Device ID: {deviceID}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create Room
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'join'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('join')}
          >
            Join Room
          </button>
        </div>

        {/* Content */}
        <div className="bg-gray-900 rounded-lg p-6">
          {activeTab === 'create' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Create a New Room</h2>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Room Name
                </Label>
                <Input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
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
                  <strong>Note:</strong> Creating a room will start a local
                  signaling server on port 4444. Others can connect to your room
                  using your IP address.
                </p>
                <p className="text-xs text-gray-400">
                  Signaling Server URL: ws://localhost:4444 (or
                  ws://YOUR_IP:4444 for remote connections)
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
            </div>
          )}

          {activeTab === 'join' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Join a Room</h2>

              {/* Connect to Custom Room */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Connect to Room</h3>

                <div className="space-y-3">
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Room Name
                    </Label>
                    <Input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter room name"
                      className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Signaling Server URL
                    </Label>
                    <Input
                      type="text"
                      value={signalingUrl}
                      onChange={(e) => setSignalingUrl(e.target.value)}
                      placeholder="ws://192.168.1.100:4444"
                      className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the IP address and port of the signaling server
                      (default port: 4444)
                    </p>
                  </div>

                  <Button
                    onClick={handleConnectToCustomRoom}
                    disabled={!roomName.trim() || !signalingUrl.trim()}
                    className="w-full"
                  >
                    Connect to Room
                  </Button>
                </div>
              </div>

              {/* Past Rooms */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Recent Rooms</h3>
                  <Button onClick={loadPastRooms} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>

                {pastRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No recent rooms found</p>
                    <p className="text-sm mt-1">
                      Create or join a room to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastRooms.map((room) => (
                      <div
                        key={room.id}
                        className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{room.name}</h4>
                              {room.description && (
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                  {room.description}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              {room.signalingUrl}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Last connected:{' '}
                              {formatDate(new Date(room.lastConnected))}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                handleJoinRoom(room.name, room.signalingUrl)
                              }
                              size="sm"
                            >
                              Connect
                            </Button>
                            <Button
                              onClick={() => room.id && deleteRoom(room.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          {envRef.current?.ydoc && (
            <TestConnection doc={envRef.current?.ydoc ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Rooms;
