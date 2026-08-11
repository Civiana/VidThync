import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import {
  userJoinRequest,
  acceptUsers,
  dismissPendingDevices,
  subscribeToSyncthingEvents,
} from 'src/syncthing/API';

interface Devices {
  id: string;
  name: string;
}

type Props = {
  roomName: string;
  onDeviceAccepted?: () => void;
};

function Joins({ roomName, onDeviceAccepted }: Props) {
  const [devices, setDevices] = useState<Devices[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchDevices() {
      try {
        const response = await userJoinRequest();
        if (isMounted && response && typeof response === 'object') {
          const deviceList = Object.keys(response).map((key) => ({
            id: key,
            name: response[key].name || 'Unnamed Device',
          }));
          setDevices(deviceList);
        }
      } catch (err) {
        console.error('[Joins] Failed to fetch pending devices:', err);
      }
    }

    fetchDevices();

    subscribeToSyncthingEvents(
      0,
      (_event) => {
        if (isMounted) {
          fetchDevices();
        }
      },
      controller.signal,
    );

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleAccept = async (device: Devices) => {
    try {
      await acceptUsers(device.id, device.name, roomName);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      if (onDeviceAccepted) {
        onDeviceAccepted();
      }
    } catch (err) {
      console.error('[Joins] Error accepting device:', err);
    }
  };

  const handleReject = async (device: Devices) => {
    try {
      await dismissPendingDevices(device.id);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (err) {
      console.error('[Joins] Error rejecting device:', err);
    }
  };

  return (
    <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700">
      <h3 className="text-md font-semibold text-white mb-3">Pending Device Join Requests</h3>
      {devices.length === 0 ? (
        <p className="text-sm text-gray-400">No pending device requests.</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-700"
            >
              <div className="truncate mr-4">
                <span className="font-medium text-white">{device.name}</span>
                <span className="text-xs text-gray-400 block truncate">{device.id}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(device)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => handleReject(device)}
                  size="sm"
                  variant="destructive"
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Joins;
