import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchDeviceID, addDevicesID } from 'src/syncthing/API';
import { useYjs } from 'src/yjsRTC/YjsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useYArray } from 'src/yjsRTC/YjsContext';
import { removeRemoteDevices } from 'src/syncthing/API';
function ConnectToRoom() {
  const [roomName, setRoomName] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [hostDeviceId, setHostDeviceId] = useState('');
  const [signalingUrl, setSignalingUrl] = useState('localhost');
  const [signalingPort, setSignalingPort] = useState('4444');
  const [hostPort, setHostPort] = useState('22000');
  const rejectedArr = useYArray<string>('rejectedArr');
  const [directOrDynamic, setDirectOrDynamic] = useState<'dynamic' | 'direct'>(
    'dynamic',
  );
  const [filePath, setFilePath] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't auto-disconnect here to allow connection to persist
      // User must explicitly disconnect via the debug panel or disconnect button
    };
  }, []);

  const handleConnectToCustomRoom = async () => {
    // Validation
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
    if (!hostDeviceId.trim()) {
      // eslint-disable-next-line no-alert
      alert('Please enter the host device ID');
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
        `You are already connected to room "${state.roomName}". Do you want to disconnect and join a new room?`,
      );
      if (!shouldDisconnect) {
        return;
      }
      await disconnect();
    }

    setIsConnecting(true);

    try {
      // Add the host device to Syncthing
      // eslint-disable-next-line no-console
      console.log('[ConnectToRoom] Adding host device to Syncthing...');
      await addDevicesID(
        '/config',
        hostDeviceId,
        signalingUrl,
        hostPort,
        filePath,
        directOrDynamic,
      );

      // eslint-disable-next-line no-console
      console.log('[ConnectToRoom] Connecting to room:', roomName);

      // Connect to the room using the connection manager
      await connect({
        roomName: `${roomName + hostDeviceId}`,
        signalingUrl,
        signalingPort,
        isHost: false,
      });

      // Add current device ID to the shared array for host to see
      const ydoc = getYDoc();
      if (ydoc) {
        const yarray = ydoc.getArray<string>('IDs');
        yarray.push([deviceID]);

        const deviceArr = ydoc.getArray<string>('deviceArr');
        deviceArr.push([deviceID]);

        // eslint-disable-next-line no-console
        console.log('[ConnectToRoom] Added device ID to shared arrays');
      }

      // eslint-disable-next-line no-console
      console.log(
        `[ConnectToRoom] Successfully connected to room: ${roomName}`,
      );

      // eslint-disable-next-line no-alert
      alert(`Successfully connected to room "${roomName}"!`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ConnectToRoom] Connection error:', error);
      // eslint-disable-next-line no-alert
      alert(
        `Failed to connect to room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsConnecting(false);
    }
  };

  console.log('Rejected Array:', rejectedArr);

  useEffect(() => {
    if (rejectedArr.length > 0) {
      rejectedArr.find((id, i) => {
        if (id === deviceID) {
          // eslint-disable-next-line no-alert
          alert('Your connection request was rejected by the host.');
          const reject = getYDoc();
          const rejArr = reject?.getArray<string>('rejectedArr');
          rejArr?.delete(i, 1);
          // removeRemoteDevices(deviceID); it did not work zaki it gives a 404 error and does not delete from syncthing
          disconnect();
        }
      });
    }
  }, [rejectedArr]);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      // eslint-disable-next-line no-alert
      alert('Disconnected from room successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ConnectToRoom] Error disconnecting:', error);
      // eslint-disable-next-line no-alert
      alert('Failed to disconnect');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-700 text-white p-8 overflow-auto">
      <Button onClick={() => navigate(-1)}>&lt; Back</Button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Join a Room</h1>
        <p className="text-gray-400">Connect to an existing VideoThync room</p>
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

      <div className="space-y-6">
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
                disabled={isConnecting}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Host Device ID
              </Label>
              <Input
                type="text"
                value={hostDeviceId}
                onChange={(e) => setHostDeviceId(e.target.value)}
                placeholder="Enter host device ID"
                disabled={isConnecting}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                The device ID of the person hosting the room
              </p>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Path to folder
              </Label>
              <Button
                onClick={handlePickFolder}
                className="mb-2"
                disabled={isConnecting}
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
              <p className="text-xs text-gray-400 mt-1">
                Local folder where files will be synced
              </p>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">Domain</Label>
              <Input
                type="text"
                value={signalingUrl}
                onChange={(e) => setSignalingUrl(e.target.value)}
                placeholder="192.168.1.100 or localhost"
                disabled={isConnecting}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                The IP address or domain of the host (without ws:// prefix)
              </p>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Host port
              </Label>
              <Input
                type="text"
                value={signalingPort}
                onChange={(e) => setSignalingPort(e.target.value)}
                placeholder="4444"
                disabled={isConnecting}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the port of the host&apos;s signaling server (default
                port: 4444)
              </p>
            </div>

            <div className="flex space-x-2">
              <Checkbox
                checked={directOrDynamic === 'direct'}
                onClick={() => {
                  if (directOrDynamic === 'direct') {
                    setDirectOrDynamic('dynamic');
                  } else {
                    setDirectOrDynamic('direct');
                  }
                }}
                disabled={isConnecting}
              />
              <div className="flex flex-col">
                <Label>
                  Make Syncthing use a direct connection to the host instead of
                  relay servers
                </Label>
                <p className="text-muted-foreground text-sm">
                  note: This only works if the host already has a port opened
                  for Syncthing.
                </p>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Syncthing file port
              </Label>
              <Input
                type="text"
                value={hostPort}
                disabled={directOrDynamic === 'dynamic' || isConnecting}
                onChange={(e) => setHostPort(e.target.value)}
                placeholder="22000"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the port of the host file syncing server (default port:
                22000)
              </p>
            </div>

            <div className="bg-gray-900 p-4 rounded-md border border-gray-600">
              <p className="text-sm text-gray-300 mb-2">
                <strong>Connection Info:</strong>
              </p>
              <p className="text-xs text-gray-400 mb-1">
                You will connect to: ws://{signalingUrl}:{signalingPort}
              </p>
              <p className="text-xs text-gray-400">
                File sync will use:{' '}
                {directOrDynamic === 'direct'
                  ? `tcp://${signalingUrl}:${hostPort}`
                  : 'dynamic relay servers'}
              </p>
            </div>

            <Button
              onClick={handleConnectToCustomRoom}
              disabled={
                !roomName.trim() ||
                !signalingUrl.trim() ||
                !hostDeviceId.trim() ||
                !filePath.trim() ||
                isConnecting ||
                state.status === 'connecting'
              }
              className="w-full"
              size="lg"
            >
              {(() => {
                if (isConnecting || state.status === 'connecting') {
                  return 'Connecting...';
                }
                if (isConnected && state.roomName === roomName) {
                  return 'Already Connected';
                }
                return 'Connect to Room';
              })()}
            </Button>

            {isConnected && (
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                Disconnect from Room
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Use the debug panel (top-right) to monitor your connection status</p>
      </div>
    </div>
  );
}

export default ConnectToRoom;
