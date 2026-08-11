import { getSyncthingApiKey } from 'src/utils/state';

const URL = 'http://localhost:8384/rest';

let apiKey: string | null = null;

// Initialize API key from electron-store state
async function initApiKey() {
  apiKey = await getSyncthingApiKey();

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
  customFolderId?: string,
  initialDevices?: string[],
) {
  const requestGET = await getRequestGET();
  const key = await initApiKey();
  const folderID = customFolderId || label;
  const device_id = await fetchDeviceID();
  const res = await fetch(URL + '/config/folders', requestGET);
  const config = await res.json();

  const deviceList = [{ deviceID: device_id }];
  if (initialDevices && Array.isArray(initialDevices)) {
    initialDevices.forEach((devId) => {
      if (devId && !deviceList.some((d) => d.deviceID === devId)) {
        deviceList.push({ deviceID: devId });
      }
    });
  }

  const folderConfig = {
    id: folderID,
    label: label,
    path: `${filePath}`,
    type: 'sendreceive', // or 'sendonly', 'receiveonly'
    devices: deviceList,
    rescanIntervalS: 60, // Scan every 60 seconds
    fsWatcherEnabled: true, // Enable filesystem watcher
    ignorePerms: false,
    autoNormalize: true,
  };

  const alreadyExists = config.some(
    (folder: any) => folder.id === folderID || folder.label === label,
  );
  if (alreadyExists) {
    console.log('Folder already exists');
    return { success: true, message: 'Folder already exists', folderId: folderID };
  }

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
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status}`);
  }
  const config = await response.json();

  // 1. Add device globally if not exists
  const deviceAlreadyExists = config.devices.some(
    (device: any) => device.deviceID === userID,
  );
  if (!deviceAlreadyExists) {
    config.devices.push({
      deviceID: userID,
      name: userName,
      addresses: ['dynamic'],
      autoAcceptFolders: true, // Required default
      compression: 'metadata', // Default
      introducer: false,
      skipIntroductionRemovals: false,
    });
  }

  // 2. Add device to folder in the SAME config object (atomic update!)
  const folderIndex = config.folders.findIndex(
    (f: any) => f.label === roomName || f.id === roomName,
  );
  if (folderIndex !== -1) {
    const folder = config.folders[folderIndex];
    const deviceInFolder = folder.devices.some(
      (d: any) => d.deviceID === userID,
    );
    if (!deviceInFolder) {
      folder.devices.push({
        deviceID: userID,
        encryptionPassword: '',
        introducedBy: '',
      });
      console.log(`[acceptUsers] Device ${userID} added to folder ${roomName}`);
    }
  } else {
    console.warn(`[acceptUsers] Folder ${roomName} not found in config.`);
  }

  const key = await initApiKey();
  const requestPUT = {
    method: 'PUT',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  };
  const res = await fetch(URL + '/config', requestPUT);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `HTTP ${res.status}: ${res.statusText} - ${errorText}`,
    );
  }
  return res;
}

export async function acceptPendingFolders(targetFolderId?: string) {
  try {
    const requestGET = await getRequestGET();
    const response = await fetch(URL + '/cluster/pending/folders', requestGET);
    if (!response.ok) {
      return;
    }
    const pendingFolders = await response.json();
    if (!pendingFolders || typeof pendingFolders !== 'object') {
      return;
    }
    const folderIDs = Object.keys(pendingFolders);
    for (const fId of folderIDs) {
      if (
        !targetFolderId ||
        fId === targetFolderId ||
        pendingFolders[fId]?.label === targetFolderId
      ) {
        console.log(
          `[acceptPendingFolders] Auto-accepting pending folder: ${fId}`,
        );
        const key = await initApiKey();
        const requestPOST = {
          method: 'POST',
          headers: {
            'X-API-Key': key || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folder: fId,
            device: pendingFolders[fId].offerer,
          }),
        };
        await fetch(
          URL + `/cluster/pending/folders?folder=${fId}`,
          requestPOST,
        );
      }
    }
  } catch (error) {
    console.error(
      '[acceptPendingFolders] Error checking/accepting pending folders:',
      error,
    );
  }
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

export async function pauseFolder(folderName: string) {
  if (!folderName) return;
  try {
    const requestGET = await getRequestGET();
    const response = await fetch(URL + '/config', requestGET);
    if (!response.ok) return;
    const config = await response.json();
    const folderIndex = config.folders.findIndex(
      (x: any) => x?.label == folderName || x?.id == folderName,
    );
    if (folderIndex !== -1) {
      if (config.folders[folderIndex].paused !== true) {
        config.folders[folderIndex].paused = true;
        const key = await initApiKey();
        const requestPUT = {
          method: 'PUT',
          headers: {
            'X-API-Key': key || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        };
        await fetch(URL + '/config', requestPUT);
        console.log(`[pauseFolder] Folder ${folderName} paused.`);
      }
    }
  } catch (error) {
    console.error('[pauseFolder] Error pausing folder:', error);
  }
}

export async function unPauseFolder(folderName: string) {
  if (!folderName) return;
  try {
    const requestGET = await getRequestGET();
    const response = await fetch(URL + '/config', requestGET);
    if (!response.ok) return;
    const config = await response.json();
    const folderIndex = config.folders.findIndex(
      (x: any) => x?.label == folderName || x?.id == folderName,
    );
    if (folderIndex !== -1) {
      if (config.folders[folderIndex].paused !== false) {
        config.folders[folderIndex].paused = false;
        const key = await initApiKey();
        const requestPUT = {
          method: 'PUT',
          headers: {
            'X-API-Key': key || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        };
        await fetch(URL + '/config', requestPUT);
        console.log(`[unPauseFolder] Folder ${folderName} unpaused.`);
      }
    }
  } catch (error) {
    console.error('[unPauseFolder] Error unpausing folder:', error);
  }
}

export async function dismissPendingDevices(userID: string) {
  const key = await initApiKey();
  const requestDEL = {
    method: 'DELETE',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
  };
  const response = await fetch(
    URL + `/cluster/pending/devices?device=${userID}`,
    requestDEL,
  );
}

export async function removeRemoteDevices(userID: string) {
  const key = await initApiKey();
  const requestDEL = {
    method: 'DELETE',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
  };
  const response = await fetch(URL + `/config/devices/${userID}`, requestDEL);
}


export async function displayFiles(folderName: string){
  const requestGET = await getRequestGET();
  const response = await fetch(URL + '/config/folders', requestGET);
  const config = await response.json();
  const folderObj = config.find((x: any) => x.label === folderName);
  const folderID = folderObj?.id
  const browse = await fetch(URL + `/db/browse?folder=${folderID}`, requestGET);
  return await browse.json()
}

export async function syncthingPortChanging(port: number){
  const requestGET = await getRequestGET();
  const response = await fetch(URL + '/config', requestGET);
  const config = await response.json();
  config.options.listenAddressses = `tcp://:${port}`
  const key = await initApiKey();
  const requestPUT = {
    method: 'PUT',
    headers: {
      'X-API-Key': key || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config)
  };
  const res = await fetch(URL + `/config`, requestPUT);
}




export async function subscribeToSyncthingEvents(
  lastId = 0,
  onSyncEvent: (event: any) => void,
  signal?: AbortSignal,
) {
  const key = await initApiKey();
  let currentId = lastId;
  while (!signal?.aborted) {
    try {
      const response = await fetch(
        `${URL}/events?since=${currentId}&timeout=60`,
        {
          headers: {
            'X-API-Key': key || '',
            'Content-Type': 'application/json',
          },
          signal,
        },
      );

      if (!response.ok || signal?.aborted) break;

      const events = await response.json();
      for (const event of events) {
        currentId = event.id;
        if (
          event.type === 'ItemFinished' ||
          event.type === 'StateChanged' ||
          event.type === 'FolderSummary' ||
          event.type === 'FolderCompletion' ||
          event.type === 'FolderPaused' ||
          event.type === 'FolderResumed' ||
          event.type === 'ClusterConfigReceived' ||
          event.type === 'RemoteIndexUpdated' ||
          event.type === 'PendingDevicesChanged' ||
          event.type === 'DeviceDiscovered' ||
          event.type === 'DeviceConnected' ||
          event.type === 'DeviceDisconnected'
        ) {
          onSyncEvent(event);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) break;
      // Wait briefly before retrying if connection drops
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

export async function fetchFolderStatus(folderId: string) {
  try {
    const requestGET = await getRequestGET();
    const res = await fetch(`${URL}/db/status?folder=${encodeURIComponent(folderId)}`, requestGET);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[fetchFolderStatus] Error:', err);
    return null;
  }
}

export async function fetchDeviceConnections() {
  try {
    const requestGET = await getRequestGET();
    const res = await fetch(`${URL}/system/connections`, requestGET);
    if (!res.ok) return {};
    const data = await res.json();
    return data.connections || {};
  } catch (err) {
    console.error('[fetchDeviceConnections] Error:', err);
    return {};
  }
}

export async function fetchFolderDevices(folderId: string) {
  try {
    const requestGET = await getRequestGET();
    const res = await fetch(`${URL}/config/folders`, requestGET);
    if (!res.ok) return [];
    const folders = await res.json();
    const folder = folders.find((f: any) => f.id === folderId || f.label === folderId);
    return folder ? folder.devices || [] : [];
  } catch (err) {
    console.error('[fetchFolderDevices] Error:', err);
    return [];
  }
}

export async function fetchDeviceFolderCompletion(folderId: string, deviceId: string) {
  try {
    const requestGET = await getRequestGET();
    const res = await fetch(
      `${URL}/db/completion?folder=${encodeURIComponent(folderId)}&device=${encodeURIComponent(deviceId)}`,
      requestGET,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[fetchDeviceFolderCompletion] Error:', err);
    return null;
  }
}



