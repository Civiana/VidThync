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
  roomName: string
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
  
  console.log(deviceArr, 'device array');
  useEffect(() => {
    async function fetchDevices() {
      const response = await userJoinRequest();

      const deviceList = Object.keys(response).map((key) => ({
        id: key,
        name: response[key].name || 'Unnamed Device',
      }));

      setDevices(deviceList);
    }

    fetchDevices();
  }, [recheck]);

  return (
    <div>
      <h2>Joined Devices</h2>
      <ul>
        {devices.map((device) => (
          <li key={device.id} className="group">
            {device.name} ({device.id})
            <button
              onClick={() => acceptUsers(device.id, device.name, roomName)}
              className="bg-green-500 hover:bg-green-600 hover:text-white text-white border border-green-700 px-4 py-2 rounded "
            >
              Accept
            </button>
          </li>
        ))}
      </ul>
      <Button
        onClick={() => {
          setRecheck(!recheck);
        }}
      >
        RECHECK
      </Button>
    </div>
  );
}

export default Joins;
