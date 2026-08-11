import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router';
import {
  createOrUpdateFolderSyncThing,
  fetchDeviceID,
  pauseFolder,
  unPauseFolder,
  fetchFolderStatus,
  fetchDeviceConnections,
  fetchFolderDevices,
  fetchDeviceFolderCompletion,
  subscribeToSyncthingEvents,
} from 'src/syncthing/API';
import {
  getCreatedRooms,
  saveCreatedRoom,
  deleteCreatedRoom,
  RoomRecord,
} from 'src/utils/state';
import Joins from './Joins';
import FilesDisplay from '../components/FilesDisplay';
import { ArrowLeft, Folder, RefreshCw, Trash2, Wifi, WifiOff, CheckCircle2, PauseCircle } from 'lucide-react';

interface DeviceStatus {
  deviceID: string;
  name?: string;
  connected: boolean;
  paused: boolean;
  remoteState: string;
  address?: string;
}

function CreateRoom() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [savedHostRooms, setSavedHostRooms] = useState<RoomRecord[]>([]);
  const [isLoadingSavedRooms, setIsLoadingSavedRooms] = useState(true);

  // Active room state
  const [activeRoom, setActiveRoom] = useState<RoomRecord | null>(null);
  const [folderStatus, setFolderStatus] = useState<any>(null);
  const [remoteDevicesStatus, setRemoteDevicesStatus] = useState<DeviceStatus[]>([]);

  const isMountedRef = useRef(true);

  const refreshSavedRooms = async () => {
    try {
      setIsLoadingSavedRooms(true);
      const rooms = await getCreatedRooms();
      setSavedHostRooms(rooms);
    } catch (error) {
      console.error('[CreateRoom] Failed to load saved rooms:', error);
    } finally {
      setIsLoadingSavedRooms(false);
    }
  };

  const updateActiveRoomStatus = async (roomKey: string) => {
    if (!roomKey) return;
    try {
      const status = await fetchFolderStatus(roomKey);
      setFolderStatus(status);

      const folderDevices = await fetchFolderDevices(roomKey);
      const connections = await fetchDeviceConnections();

      const devStatusList: DeviceStatus[] = await Promise.all(
        folderDevices
          .filter((d: any) => d.deviceID !== deviceID)
          .map(async (d: any) => {
            const conn = connections[d.deviceID];
            const comp = await fetchDeviceFolderCompletion(roomKey, d.deviceID);
            return {
              deviceID: d.deviceID,
              name: d.deviceID.substring(0, 7),
              connected: !!(conn && conn.connected),
              paused: !!(conn && conn.paused),
              remoteState: comp?.remoteState || 'unknown',
              address: conn?.address,
            };
          })
      );

      setRemoteDevicesStatus(devStatusList);
    } catch (err) {
      console.error('[CreateRoom] Failed to fetch room status:', err);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    async function init() {
      const id = await fetchDeviceID();
      setDeviceID(id);
      await refreshSavedRooms();
    }
    init();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Poll / Subscribe to Syncthing events for active room
  useEffect(() => {
    if (!activeRoom) return;

    const controller = new AbortController();
    updateActiveRoomStatus(activeRoom.roomKey);

    subscribeToSyncthingEvents(
      0,
      () => {
        if (isMountedRef.current && activeRoom) {
          updateActiveRoomStatus(activeRoom.roomKey);
        }
      },
      controller.signal,
    );

    // Also periodic poll every 5s as fallback
    const interval = setInterval(() => {
      if (activeRoom) {
        updateActiveRoomStatus(activeRoom.roomKey);
      }
    }, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [activeRoom, deviceID]);

  const handlePickFolder = async () => {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setFolderPath(selectedPath);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    if (!folderPath.trim()) {
      alert('Please select a folder path');
      return;
    }

    setIsCreating(true);
    try {
      const roomKey = `${roomName.trim()}${deviceID}`;

      await createOrUpdateFolderSyncThing(
        '/config/folders',
        roomKey,
        folderPath,
        roomKey,
      );

      await unPauseFolder(roomKey);

      const roomRecord: RoomRecord = {
        roomName: roomName.trim(),
        roomKey,
        filePath: folderPath,
        isHost: true,
        description: customDescription.trim(),
        createdAt: new Date().toISOString(),
      };

      await saveCreatedRoom(roomRecord);
      await refreshSavedRooms();
      setActiveRoom(roomRecord);

      alert(`Room "${roomName.trim()}" created successfully!`);
    } catch (error) {
      console.error('[CreateRoom] Error creating room:', error);
      alert(`Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenSavedRoom = async (room: RoomRecord) => {
    try {
      await unPauseFolder(room.roomKey);
      setActiveRoom(room);
      setRoomName(room.roomName);
      setFolderPath(room.filePath);
      setCustomDescription(room.description || '');
    } catch (err) {
      console.error('[CreateRoom] Error opening room:', err);
    }
  };

  const handleDeleteSavedRoom = async (roomKey: string) => {
    if (window.confirm('Are you sure you want to remove this saved room?')) {
      await deleteCreatedRoom(roomKey);
      if (activeRoom?.roomKey === roomKey) {
        setActiveRoom(null);
      }
      await refreshSavedRooms();
    }
  };

  const handleCloseRoom = async () => {
    if (activeRoom) {
      await pauseFolder(activeRoom.roomKey);
      setActiveRoom(null);
    }
  };

  // Helper for rendering sync status text
  const renderSyncStatus = () => {
    if (!folderStatus) return <span className="text-gray-400">Loading sync status...</span>;

    const state = folderStatus.state || 'unknown';
    const needBytes = folderStatus.needBytes || 0;
    const globalBytes = folderStatus.globalBytes || 0;
    const inSyncBytes = folderStatus.inSyncBytes || 0;

    const hasPausedPeer = remoteDevicesStatus.some(
      (d) => d.connected && (d.paused || d.remoteState === 'paused'),
    );

    let percentage = 100;
    if (globalBytes > 0) {
      percentage = Math.round((inSyncBytes / globalBytes) * 100);
    }

    if (hasPausedPeer) {
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
          <PauseCircle className="w-4 h-4 text-amber-400" /> Up to date locally (Peer Paused Folder)
        </span>
      );
    }

    if (state === 'idle' && needBytes === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-green-400 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-green-400" /> Up to date (Idle)
        </span>
      );
    }

    if (state === 'syncing' || needBytes > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-blue-400 font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> Syncing ({percentage}%)
        </span>
      );
    }

    return (
      <span className="text-yellow-400 font-semibold capitalize">
        Status: {state}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white p-8 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex items-center gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Create Room (Host)</h1>
            <p className="text-xs text-gray-400">Device ID: {deviceID}</p>
          </div>
        </div>

        {/* Active Room View */}
        {activeRoom ? (
          <div className="bg-gray-800 border border-green-500/40 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 uppercase tracking-wide">
                  Active Room
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">{activeRoom.roomName}</h2>
                <p className="text-xs text-gray-400 mt-1">Folder: {activeRoom.filePath}</p>
              </div>
              <Button onClick={handleCloseRoom} variant="destructive" size="sm">
                Close Room
              </Button>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Folder Sync Status</h4>
                <div className="text-base">{renderSyncStatus()}</div>
                {folderStatus && (
                  <p className="text-xs text-gray-500 mt-2">
                    Files Synced: {folderStatus.inSyncFiles || 0} / {folderStatus.globalFiles || 0}
                  </p>
                )}
              </div>

              <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Shared Remote Devices</h4>
                {remoteDevicesStatus.length === 0 ? (
                  <p className="text-xs text-gray-500 mt-1">No remote devices added yet.</p>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {remoteDevicesStatus.map((dev) => {
                      const isPaused = dev.paused || dev.remoteState === 'paused';
                      return (
                        <div key={dev.deviceID} className="flex items-center justify-between text-xs">
                          <span className="truncate font-mono text-gray-300">{dev.deviceID.substring(0, 15)}...</span>
                          {dev.connected ? (
                            isPaused ? (
                              <span className="flex items-center gap-1 text-amber-400 font-medium" title="User paused folder">
                                <PauseCircle className="w-3.5 h-3.5" /> Online (Paused / Disconnected)
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-400 font-medium">
                                <Wifi className="w-3.5 h-3.5" /> Online & Synced
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-gray-500 font-medium">
                              <WifiOff className="w-3.5 h-3.5" /> Offline
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Devices Join Request Component */}
            <Joins
              roomName={activeRoom.roomKey}
              onDeviceAccepted={() => updateActiveRoomStatus(activeRoom.roomKey)}
            />

            {/* Synced Files & Syncplay Launcher */}
            <FilesDisplay
              roomName={activeRoom.roomKey}
              folderPath={activeRoom.filePath}
            />
          </div>
        ) : (
          /* Create New Room Form */
          <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
            <h2 className="text-xl font-semibold mb-2">Host a New Room</h2>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Room Name</Label>
              <Input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                disabled={isCreating}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Folder Path</Label>
              <div className="flex gap-2">
                <Input
                  value={folderPath}
                  placeholder="Select local folder to sync"
                  readOnly
                  className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                />
                <Button onClick={handlePickFolder} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white flex gap-1.5 items-center">
                  <Folder className="w-4 h-4" /> Browse
                </Button>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Description (Optional)</Label>
              <Input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Brief description of this room"
                disabled={isCreating}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={isCreating || !roomName.trim() || !folderPath.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold mt-4"
              size="lg"
            >
              {isCreating ? 'Creating Room...' : 'Create Room'}
            </Button>
          </div>
        )}

        {/* Saved Host Rooms */}
        <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl mt-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Saved Host Rooms</h3>
          {isLoadingSavedRooms ? (
            <p className="text-sm text-gray-400">Loading saved rooms...</p>
          ) : savedHostRooms.length === 0 ? (
            <p className="text-sm text-gray-500">No saved host rooms yet.</p>
          ) : (
            <div className="space-y-3">
              {savedHostRooms.map((room) => (
                <div
                  key={room.roomKey}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-900 border border-gray-700"
                >
                  <div>
                    <h4 className="font-semibold text-white">{room.roomName}</h4>
                    <p className="text-xs text-gray-400 truncate max-w-md">Folder: {room.filePath}</p>
                    {room.description && (
                      <p className="text-xs text-gray-500 mt-1">{room.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleOpenSavedRoom(room)}
                      disabled={activeRoom?.roomKey === room.roomKey}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      {activeRoom?.roomKey === room.roomKey ? 'Active' : 'Open Room'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteSavedRoom(room.roomKey)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateRoom;
