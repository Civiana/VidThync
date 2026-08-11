import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import {
  userJoinRequest,
  acceptUsers,
  dismissPendingDevices,
  subscribeToSyncthingEvents,
} from 'src/syncthing/API';
import * as Y from 'yjs';

interface Devices {
  id: string;
  name: string;
}

type props = {
  ydoc?: Y.Doc;
  roomName: string;
};

function Joins({ ydoc, roomName }: props) {
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
      if (ydoc) {
        const newDeviceArr = ydoc.getArray<string>('deviceArr');
        const index = newDeviceArr.toArray().indexOf(device.id);
        if (index !== -1) {
          newDeviceArr.delete(index, 1);
        }
      }
    } catch (err) {
      console.error('[Joins] Error accepting device:', err);
    }
  };

  const handleReject = async (device: Devices) => {
    try {
      await dismissPendingDevices(device.id);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      if (ydoc) {
        const rejectedArr = ydoc.getArray<string>('rejectedArr');
        rejectedArr.push([device.id]);
        const newDeviceArr = ydoc.getArray<string>('deviceArr');
        const index = newDeviceArr.toArray().indexOf(device.id);
        if (index !== -1) {
          newDeviceArr.delete(index, 1);
        }
      }
    } catch (err) {
      console.error('[Joins] Error rejecting device:', err);
    }
  };

  return (
    <div>
      <h2>Joined Devices</h2>
      {devices.length === 0 ? (
        <p className="text-sm text-gray-400">No pending device requests.</p>
      ) : (
        <ul>
          {devices.map((device) => (
            <li key={device.id} className="group">
              {device.name} ({device.id})
              <Button
                onClick={() => handleAccept(device)}
                className="bg-green-500 hover:bg-green-600 hover:text-white text-white border border-green-700 px-4 py-2 rounded ml-2"
              >
                Accept
              </Button>
              <Button
                onClick={() => handleReject(device)}
                className="bg-red-500 hover:bg-red-600 hover:text-white text-white border border-red-700 px-4 py-2 rounded ml-2"
              >
                Reject
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Joins;

