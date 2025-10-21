import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { userJoinRequest, acceptUsers } from 'src/syncthing/API';
import * as Y from 'yjs';

interface Devices {
  id: string;
  name: string;
}

type props = {
  ydoc: Y.Doc;
  roomName: string;
};

function Joins({ ydoc, roomName }: props) {
  const [devices, setDevices] = useState<Devices[]>([]);
  const [recheck, setRecheck] = useState<boolean>(false);
  const [deviceArr, setDeviceArr] = useState<string[]>([]);

  useEffect(() => {
    const newDeviceArr = ydoc.getArray<string>('deviceArr');
    setDeviceArr(newDeviceArr.toArray());
    const observer = () => {
      setDeviceArr(newDeviceArr.toArray());
    };
    newDeviceArr.observe(observer);
    return () => {
      newDeviceArr.unobserve(observer);
    };
  }, []);
  console.log('deviceArr', deviceArr);

  function deleteAcceptedOrRejectedRequest(deviceId: string) {
    // Remove from local devices state
    setDevices((prevDevices) =>
      prevDevices.filter((device) => device.id !== deviceId),
    );

    // Remove from YJS deviceArr
    const newDeviceArr = ydoc.getArray<string>('deviceArr');
    const index = newDeviceArr.toArray().indexOf(deviceId);
    if (index !== -1) {
      newDeviceArr.delete(index, 1);
    }
  }

  useEffect(() => {
    async function fetchDevices() {
      const response = await userJoinRequest();
      const deviceList = Object.keys(response).map((key) => ({
        id: key,
        name: response[key].name || 'Unnamed Device',
      }));

      setDevices(deviceList);
    }

    if (deviceArr.length > 0) {
      fetchDevices();

      const intervalId = setInterval(() => {
        fetchDevices();
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [deviceArr]);

  return (
    <div>
      <h2>Joined Devices</h2>
      <ul>
        {devices.map((device) => (
          <li key={device.id} className="group">
            {device.name} ({device.id})
            <Button
              onClick={() => {
                acceptUsers(device.id, device.name, roomName);
                deleteAcceptedOrRejectedRequest(device.id);
              }}
              className="bg-green-500 hover:bg-green-600 hover:text-white text-white border border-green-700 px-4 py-2 rounded "
            >
              Accept
            </Button>
          </li>
        ))}
      </ul>
      <Button
        onClick={() => {
          const newDeviceArr = ydoc.getArray<string>('deviceArr');
          newDeviceArr.push([
            '7NJG3YP-PFW7O6O-QXL23UA-6GRJJFX-CWNH7FJ-VORH2O6-ZKSKBFD-CCSI2QH',
          ]);
        }}
      >
        RECHECK
      </Button>
    </div>
  );
}

export default Joins;
