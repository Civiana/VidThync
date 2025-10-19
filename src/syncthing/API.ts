import { apiFetching } from "./apiKeyFetcher";
const URL = 'http://localhost:8384/rest';

async function getGETRequest() {
  const apiKey= await apiFetching();
  return {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
  };
}

async function getPOSTRequest(body: any) {
  const apiKey = await apiFetching();
  return {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function generateRandomFolderId(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    if (i === 5) result += '-'; // Insert dash at position 5 (like Syncthing)
    const char = chars.charAt(Math.floor(Math.random() * chars.length));
    result += char;
  }
  return result;
}

export const fetchDeviceID = async () => {
  const requestGET = await getGETRequest();
  const res = await fetch(URL + '/system/status', requestGET);
  const config = await res.json();
  return config.myID;
};

export async function createOrUpdateFolderSyncThing(
  endpoint: string,
  label: string,
  filePath: string,
) {
  const folderID = generateRandomFolderId();
  const device_id = await fetchDeviceID();
  const folderConfig = {
    id: folderID,
    label: label,
    path: `${filePath}`,
    type: 'sendreceive', // or 'sendonly', 'receiveonly'
    devices: [
      {
        deviceID: device_id,
      },
    ],
    rescanIntervalS: 60, // Scan every 60 seconds
    fsWatcherEnabled: true, // Enable filesystem watcher
    ignorePerms: false,
    autoNormalize: true,
  };
  const requestPOST = await getPOSTRequest(folderConfig);
  try {
    const response = await fetch(URL + endpoint, requestPOST);

    if (!response.ok) {
      // If the server returns an error, it might have a text body
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
      );
    }

    // FIX 2: Do not parse JSON. A successful response may be empty.
    // The fact that response.ok is true is our success indicator.
    console.log(
      `Successfully created/updated folder. Status: ${response.status}`,
    );
    return { success: true, folderId: folderID, status: response.status };
  } catch (err) {
    console.error('Fetch failed:', err);
    // Re-throw or handle the error as appropriate for your application
    throw err;
  }
}

export async function addDevicesID(endpoint: string, deviseID: string) {
  const requestGET = await getGETRequest();
  const response = await fetch(URL + endpoint, requestGET);
  const config = await response.json();
  const alreadyExists = config.devices.some(
    (device: any) => device.deviceID === deviseID,
  );
  if (alreadyExists) {
    console.log('Device already exists');
    return { success: true, message: 'Device already exists' };
  }
  config.devices.push({
    deviceID: deviseID,
    name: 'New Device',
    addresses: ['dynamic'], // Required default
    compression: 'metadata', // Default
    introducer: false,
    skipIntroductionRemovals: false,
  });
  const requestPOST = await getPOSTRequest(config);
  const res = await fetch(URL + endpoint, requestPOST);
  console.log(res);
  if (!res.ok) {
    // If the server returns an error, it might have a text body
    const errorText = await response.text();
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
    );
  }
  return res;
}

export async function userJoinRequest(){
  const requestGET = await getGETRequest();
  const response = await fetch(URL + '/cluster/pending/devices', requestGET);
  if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  const res_json = await response.json();
  return res_json

}

export async function acceptUsers(userID: string, userName: string){
  const requestGET = await getGETRequest();
  const response = await fetch(URL + '/config', requestGET);
  const config = await response.json();
  config.devices.push({
    deviceID: userID,
    name: userName,
    addresses: ['dynamic'], // Required default
    compression: 'metadata', // Default
    introducer: false,
    skipIntroductionRemovals: false,
  });
  const requestPOST = await getPOSTRequest(config);
  const res = await fetch(URL + '/config', requestPOST);
  if (!res.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
    );
  }
  return res;
}

export async function fetchSyncthingData(endpoint: string) {
  const requestGET = await getGETRequest();

  try {
    const response = await fetch(URL + endpoint, requestGET);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return json;
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
