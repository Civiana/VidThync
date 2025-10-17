import React, { useState, useEffect } from 'react';
import { userJoinRequest, acceptUsers } from 'src/syncthing/API';


interface Devices{
    id: string
    name: string
}

function Joins() {
  const [devices, setDevices] = useState<Devices[]>([]);

  useEffect(() => {
    async function fetchDevices() {
      const response = await userJoinRequest();

      const deviceList= Object.keys(response).map((key) => ({
        id: key,
        name: response[key].name || 'Unnamed Device'
      }));

      setDevices(deviceList);
    }

    fetchDevices();
  }, []);

  return (
    <div>
      <h2>Joined Devices</h2>
      <ul>
        {devices.map((device) => (
          <li key={device.id} className='group'>
            {device.name} ({device.id})
            <button onClick={() => acceptUsers(device.id, device.name)} className="bg-green-500 hover:bg-green-600 hover:text-white text-white border border-green-700 px-4 py-2 rounded ">Accept</button>

          </li>
        ))}
      </ul>
    </div>
  );
}

export default Joins;
