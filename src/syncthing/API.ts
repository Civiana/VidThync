import { loadSyncthingApiKey } from 'src/utils/apiKeyStorage';

const URL = 'http://localhost:8384/rest';

let apiKey: string | null = null;

// Initialize API key from IndexedDB
async function initApiKey() {
  apiKey = await loadSyncthingApiKey();

  return apiKey;
}

async function getRequestGET() {
  const key = await initApiKey();
  return {
    method: 'GET',
    headers: {
      'X-API-Key': key || '',
    },
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
  const requestGET = await getRequestGET();
  const res = await fetch(URL + '/system/status', requestGET);
  const config = await res.json();
  return config.myID;
};

export async function createOrUpdateFolderSyncThing(
  endpoint: string,
  label: string,
  filePath: string,
) {
  const key = await initApiKey();
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
  const requestPOST = {
    method: 'POST',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folderConfig),
  };
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

export async function addDevicesID(
  endpoint: string,
  deviseID: string,
  domain: string,
  port: string,
  path: string,
  directOrDynamic: 'dynamic' | 'direct',
) {
  const requestGET = await getRequestGET();
  const response = await fetch(URL + endpoint, requestGET);
  const config = await response.json();
  const alreadyExists = config.devices.some(
    (device: any) => device.deviceID === deviseID,
  );
  if (alreadyExists) {
    console.log('Device already exists');
    return { success: true, message: 'Device already exists' };
  }
  const addr =
    directOrDynamic === 'direct' ? `tcp://${domain}:${port}` : 'dynamic';
  config.devices.push({
    deviceID: deviseID,
    name: 'New Device',
    addresses: [addr],
    autoAcceptFolders: true, // Required default
    compression: 'metadata', // Default
    introducer: false,
    skipIntroductionRemovals: false,
  });
  config.defaults.folder.path = `${path}`;

  const key = await initApiKey();
  const requestPOST = {
    method: 'PUT',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  };
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

export async function userJoinRequest() {
  const requestGET = await getRequestGET();
  const response = await fetch(URL + '/cluster/pending/devices', requestGET);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const res_json = await response.json();
  return res_json;
}

export async function acceptUsers(
  userID: string,
  userName: string,
  roomName: string,
) {
  const requestGET = await getRequestGET();
  const response = await fetch(URL + '/config', requestGET);
  const config = await response.json();
  config.devices.push({
    deviceID: userID,
    name: userName,
    addresses: ['dynamic'],
    autoAcceptFolders: true, // Required default
    compression: 'metadata', // Default
    introducer: false,
    skipIntroductionRemovals: false,
  });

  const key = await initApiKey();
  const requestPOST = {
    method: 'PUT',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  };
  const res = await fetch(URL + '/config', requestPOST);
  addUserToFolder(userID, roomName);
  if (!res.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
    );
  }
  return res;
}

export async function fetchSyncthingData(endpoint: string) {
  try {
    const requestGET = await getRequestGET();
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

export async function addUserToFolder(deviceNo: string, folderName: string) {
  try {
    const requestGET = await getRequestGET();
    const response = await fetch(URL + `/config`, requestGET);

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`);
    }

    const json = await response.json();
    const foldersIndex = json.folders.findIndex(
      (x: any) => x.label == folderName,
    );

    if (foldersIndex === -1) {
      console.error('Folder with specified label not found.');
      return;
    }
    const folder = json.folders[foldersIndex];

    const deviceExistsGlobally = json.devices.some(
      (d: any) => d.deviceID === deviceNo,
    );
    if (!deviceExistsGlobally) {
      console.error(
        `Device ${deviceNo} is not in the global config. Add it to 'devices' before using it in a folder.`,
      );
      return;
    }

    const alreadyExistsInFolder = folder.devices.some(
      (d: any) => d.deviceID === deviceNo,
    );
    if (!alreadyExistsInFolder) {
      folder.devices.push({
        deviceID: deviceNo,
        encryptionPassword: '',
        introducedBy: '',
      });
      console.log(`Device ${deviceNo} added to folder.`);
    } else {
      console.log('Device already exists in the folder.');
    }
    const key = await initApiKey();
    const requestPOST = {
      method: 'PUT',
      headers: {
        'X-API-Key': key || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(json),
    };

    const res = await fetch(URL + '/config', requestPOST);
    if (!res.ok) {
      console.log(`Error with response ${res.status}`);
    }
  } catch (error) {
    console.error(error);
  }
}
