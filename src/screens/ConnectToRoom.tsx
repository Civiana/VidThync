import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchDeviceID,
  addDevicesID,
  createOrUpdateFolderSyncThing,
  acceptPendingFolders,
  pauseFolder,
  unPauseFolder,
  fetchFolderStatus,
  fetchDeviceConnections,
  subscribeToSyncthingEvents,
} from 'src/syncthing/API';
import {
  getJoinedRooms,
  saveJoinedRoom,
  deleteJoinedRoom,
  RoomRecord,
} from 'src/utils/state';
import FilesDisplay from '../components/FilesDisplay';
import { ArrowLeft, Folder, Trash2, Wifi, WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';

function ConnectToRoom() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [hostDeviceId, setHostDeviceId] = useState('');
  const [hostAddress, setHostAddress] = useState('localhost');
  const [hostPort, setHostPort] = useState('22000');
  const [directOrDynamic, setDirectOrDynamic] = useState<'dynamic' | 'direct'>('dynamic');
  const [folderPath, setFolderPath] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [savedPeerRooms, setSavedPeerRooms] = useState<RoomRecord[]>([]);
  const [isLoadingSavedRooms, setIsLoadingSavedRooms] = useState(true);

  // Active room state
  const [activeRoom, setActiveRoom] = useState<RoomRecord | null>(null);
  const [folderStatus, setFolderStatus] = useState<any>(null);
  const [isHostOnline, setIsHostOnline] = useState<boolean>(false);

  const isMountedRef = useRef(true);

  const refreshSavedRooms = async () => {
    try {
      setIsLoadingSavedRooms(true);
      const rooms = await getJoinedRooms();
      setSavedPeerRooms(rooms);
    } catch (error) {
      console.error('[ConnectToRoom] Failed to load saved rooms:', error);
    } finally {
      setIsLoadingSavedRooms(false);
    }
  };

  const updateActiveRoomStatus = async (roomKey: string, targetHostId: string) => {
    if (!roomKey) return;
    try {
      const status = await fetchFolderStatus(roomKey);
      setFolderStatus(status);

      if (targetHostId) {
        const connections = await fetchDeviceConnections();
        const conn = connections[targetHostId];
        setIsHostOnline(!!(conn && conn.connected));
      }
    } catch (err) {
      console.error('[ConnectToRoom] Failed to fetch room status:', err);
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

  // Poll / Subscribe to Syncthing events for active connected room
  useEffect(() => {
    if (!activeRoom) return;

    const controller = new AbortController();
    updateActiveRoomStatus(activeRoom.roomKey, activeRoom.hostDeviceId || '');

    subscribeToSyncthingEvents(
      0,
      () => {
        if (isMountedRef.current && activeRoom) {
          updateActiveRoomStatus(activeRoom.roomKey, activeRoom.hostDeviceId || '');
        }
      },
      controller.signal,
    );

    const interval = setInterval(() => {
      if (activeRoom) {
        updateActiveRoomStatus(activeRoom.roomKey, activeRoom.hostDeviceId || '');
      }
    }, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [activeRoom]);

  const handlePickFolder = async () => {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setFolderPath(selectedPath);
    }
  };

  const handleConnectRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    if (!hostDeviceId.trim()) {
      alert('Please enter the host device ID');
      return;
    }
    if (!folderPath.trim()) {
      alert('Please select a folder path');
      return;
    }

    setIsConnecting(true);

    try {
      const cleanHostId = hostDeviceId.trim();
      const cleanRoomName = roomName.trim();
      const roomKey = `${cleanRoomName}${cleanHostId}`;

      // 1. Add host device to local Syncthing
      await addDevicesID(
        '/config',
        cleanHostId,
        hostAddress.trim() || 'localhost',
        hostPort.trim() || '22000',
        folderPath,
        directOrDynamic,
      );

      // 2. Create folder locally shared with host device
      await createOrUpdateFolderSyncThing(
        '/config/folders',
        roomKey,
        folderPath,
        roomKey,
        [cleanHostId],
      );

      // 3. Accept pending folder invitations
      await acceptPendingFolders(roomKey);

      // 4. Unpause folder
      await unPauseFolder(roomKey);

      const roomRecord: RoomRecord = {
        roomName: cleanRoomName,
        roomKey,
        filePath: folderPath,
        isHost: false,
        hostDeviceId: cleanHostId,
        hostPort: hostPort.trim(),
        signalingUrl: hostAddress.trim(),
        connectionMode: directOrDynamic,
        createdAt: new Date().toISOString(),
      };

      await saveJoinedRoom(roomRecord);
      await refreshSavedRooms();
      setActiveRoom(roomRecord);

      alert(`Successfully connected to room "${cleanRoomName}"!`);
    } catch (error) {
      console.error('[ConnectToRoom] Connection error:', error);
      alert(`Failed to connect to room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSavedRoom = async (room: RoomRecord) => {
    try {
      await unPauseFolder(room.roomKey);
      if (room.hostDeviceId) {
        await acceptPendingFolders(room.roomKey);
      }
      setActiveRoom(room);
      setRoomName(room.roomName);
      setHostDeviceId(room.hostDeviceId || '');
      setFolderPath(room.filePath);
      setHostAddress(room.signalingUrl || 'localhost');
      setHostPort(room.hostPort || '22000');
      setDirectOrDynamic(room.connectionMode === 'direct' ? 'direct' : 'dynamic');
    } catch (err) {
      console.error('[ConnectToRoom] Error connecting to saved room:', err);
    }
  };

  const handleDeleteSavedRoom = async (roomKey: string) => {
    if (window.confirm('Are you sure you want to remove this saved room?')) {
      await deleteJoinedRoom(roomKey);
      if (activeRoom?.roomKey === roomKey) {
        setActiveRoom(null);
      }
      await refreshSavedRooms();
    }
  };

  const handleDisconnect = async () => {
    if (activeRoom) {
      await pauseFolder(activeRoom.roomKey);
      setActiveRoom(null);
    }
  };

  const renderSyncStatus = () => {
    if (!folderStatus) return <span className="text-gray-400">Loading sync status...</span>;

    const state = folderStatus.state || 'unknown';
    const needBytes = folderStatus.needBytes || 0;
    const globalBytes = folderStatus.globalBytes || 0;
    const inSyncBytes = folderStatus.inSyncBytes || 0;

    let percentage = 100;
    if (globalBytes > 0) {
      percentage = Math.round((inSyncBytes / globalBytes) * 100);
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
            <h1 className="text-2xl font-bold">Connect to Room</h1>
            <p className="text-xs text-gray-400">Your Device ID: {deviceID}</p>
          </div>
        </div>

        {/* Active Connected Room View */}
        {activeRoom ? (
          <div className="bg-gray-800 border border-green-500/40 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 uppercase tracking-wide">
                  Connected Room
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">{activeRoom.roomName}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Host ID: {activeRoom.hostDeviceId || 'Unknown'} | Folder: {activeRoom.filePath}
                </p>
              </div>
              <Button onClick={handleDisconnect} variant="destructive" size="sm">
                Disconnect
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
                <h4 className="text-sm font-medium text-gray-400 mb-1">Host Connection Status</h4>
                <div className="mt-2">
                  {isHostOnline ? (
                    <span className="flex items-center gap-1.5 text-green-400 font-semibold">
                      <Wifi className="w-4 h-4" /> Host Online & Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-gray-400 font-semibold">
                      <WifiOff className="w-4 h-4" /> Host Offline / Connecting...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Synced Files & Syncplay Launcher */}
            <FilesDisplay
              roomName={activeRoom.roomKey}
              folderPath={activeRoom.filePath}
            />
          </div>
        ) : (
          /* Connect Room Form */
          <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
            <h2 className="text-xl font-semibold mb-2">Join an Existing Room</h2>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Room Name</Label>
              <Input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                disabled={isConnecting}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Host Device ID</Label>
              <Input
                type="text"
                value={hostDeviceId}
                onChange={(e) => setHostDeviceId(e.target.value)}
                placeholder="Enter host Syncthing device ID"
                disabled={isConnecting}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Local Folder Path</Label>
              <div className="flex gap-2">
                <Input
                  value={folderPath}
                  placeholder="Select local folder for synced files"
                  readOnly
                  className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                />
                <Button onClick={handlePickFolder} disabled={isConnecting} className="bg-blue-600 hover:bg-blue-700 text-white flex gap-1.5 items-center">
                  <Folder className="w-4 h-4" /> Browse
                </Button>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2 text-gray-200">Host Address / Domain (Optional)</Label>
              <Input
                type="text"
                value={hostAddress}
                onChange={(e) => setHostAddress(e.target.value)}
                placeholder="localhost or IP address (e.g. 192.168.1.50)"
                disabled={isConnecting}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="directConn"
                checked={directOrDynamic === 'direct'}
                onCheckedChange={(checked) => setDirectOrDynamic(checked ? 'direct' : 'dynamic')}
                disabled={isConnecting}
              />
              <Label htmlFor="directConn" className="text-sm font-normal text-gray-300 cursor-pointer">
                Use direct connection to host instead of relay servers
              </Label>
            </div>

            {directOrDynamic === 'direct' && (
              <div>
                <Label className="block text-sm font-medium mb-2 text-gray-200">Host Syncthing File Port</Label>
                <Input
                  type="text"
                  value={hostPort}
                  onChange={(e) => setHostPort(e.target.value)}
                  placeholder="22000"
                  disabled={isConnecting}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
            )}

            <Button
              onClick={handleConnectRoom}
              disabled={isConnecting || !roomName.trim() || !hostDeviceId.trim() || !folderPath.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold mt-4"
              size="lg"
            >
              {isConnecting ? 'Connecting...' : 'Connect to Room'}
            </Button>
          </div>
        )}

        {/* Saved Peer Rooms */}
        <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl mt-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Saved Joined Rooms</h3>
          {isLoadingSavedRooms ? (
            <p className="text-sm text-gray-400">Loading saved rooms...</p>
          ) : savedPeerRooms.length === 0 ? (
            <p className="text-sm text-gray-500">No saved joined rooms yet.</p>
          ) : (
            <div className="space-y-3">
              {savedPeerRooms.map((room) => (
                <div
                  key={room.roomKey}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-900 border border-gray-700"
                >
                  <div>
                    <h4 className="font-semibold text-white">{room.roomName}</h4>
                    <p className="text-xs text-gray-400">Host ID: {room.hostDeviceId || 'N/A'}</p>
                    <p className="text-xs text-gray-400 truncate max-w-md">Folder: {room.filePath}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleConnectSavedRoom(room)}
                      disabled={activeRoom?.roomKey === room.roomKey}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      {activeRoom?.roomKey === room.roomKey ? 'Connected' : 'Connect'}
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

export default ConnectToRoom;
