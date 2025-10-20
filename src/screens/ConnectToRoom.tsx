import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TestConnection from 'src/components/TestConnection';
import { fetchDeviceID, addDevicesID } from 'src/syncthing/API';
import {
  createYEnvironment,
  destroyYEnvironment,
  type YEnvironment,
} from 'src/yjsRTC/setup';

function ConnectToRoom() {
  const [roomName, setRoomName] = useState('');
  const [deviceID, setDeviceID] = useState('');
  const [hostDeviceId, setHostDeviceId] = useState('');
  const [signalingUrl, setSignalingUrl] = useState('ws://localhost:4444');
  const [filePath, setFilePath] = useState('');
  const [env, setEnv] = useState(false);
  const envRef = useRef<YEnvironment | null>(null);
  const navigate = useNavigate();

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

  const handleJoinRoom = async (name: string, url: string) => {
    try {
      // Here you would typically connect to the room
      // eslint-disable-next-line no-console
      console.log(`Connecting to room: ${name} at ${url}`);
      // eslint-disable-next-line no-alert
      alert(`Connecting to room "${name}" at ${url}`);
      envRef.current = createYEnvironment(roomName, url);
      setEnv(true);
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
    if (envRef.current) {
      destroyYEnvironment(envRef.current);
    }
    handleJoinRoom(roomName, signalingUrl);
    addDevicesID('/config', hostDeviceId);
    const yarray = envRef?.current?.ydoc.getArray('IDs');
    yarray?.push([deviceID]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-700 text-white p-8 overflow-auto">
      <Button onClick={() => navigate(-1)}>&lt;</Button>
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
                Host Device ID
              </Label>
              <Input
                type="text"
                value={hostDeviceId}
                onChange={(e) => setHostDeviceId(e.target.value)}
                placeholder="Enter host device ID"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
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
                Enter the IP address and port of the signaling server (default
                port: 4444)
              </p>
            </div>

            <Button
              onClick={handleConnectToCustomRoom}
              disabled={!roomName.trim() || !signalingUrl.trim()}
              className="w-full"
            >
              Connect to room
            </Button>

            <Button
              onClick={() => {
                if (!envRef.current) return;
                destroyYEnvironment(envRef.current);
              }}
              disabled={envRef.current === null}
              className="w-full"
            >
              disconnect
            </Button>
          </div>
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

export default ConnectToRoom;
