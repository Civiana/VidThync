export interface AppSettings {
  playerPath: string;
  syncplayHostURL: string;
  serverpass: string;
  username: string;
}

export interface RoomRecord {
  roomName: string;
  roomKey: string;
  filePath: string;
  isHost: boolean;
  description?: string;
  hostDeviceId?: string;
  hostPort?: string;
  signalingUrl?: string;
  connectionMode?: 'dynamic' | 'direct';
  createdAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  playerPath: '/usr/bin/mpv',
  syncplayHostURL: 'syncplay.pl:8996',
  serverpass: '',
  username: '',
};

// Generic store getter/setter using window.electronAPI.store
export async function storeGet<T>(key: string, defaultValue?: T): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI?.store) {
    const val = await window.electronAPI.store.get(key);
    return val !== undefined ? val : (defaultValue as T);
  }
  return defaultValue as T;
}

export async function storeSet(key: string, value: any): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electronAPI?.store) {
    return await window.electronAPI.store.set(key, value);
  }
  return false;
}

export async function storeDelete(key: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electronAPI?.store) {
    return await window.electronAPI.store.delete(key);
  }
  return false;
}

// Syncthing API Key
export async function getSyncthingApiKey(): Promise<string | null> {
  return await storeGet<string | null>('syncthingApiKey', null);
}

export async function setSyncthingApiKey(key: string): Promise<void> {
  await storeSet('syncthingApiKey', key);
}

// Created Rooms (Host)
export async function getCreatedRooms(): Promise<RoomRecord[]> {
  const rooms = await storeGet<RoomRecord[]>('createdRooms', []);
  return Array.isArray(rooms) ? rooms : [];
}

export async function saveCreatedRoom(room: RoomRecord): Promise<void> {
  const rooms = await getCreatedRooms();
  const index = rooms.findIndex((r) => r.roomKey === room.roomKey || r.roomName === room.roomName);
  if (index !== -1) {
    rooms[index] = { ...rooms[index], ...room };
  } else {
    rooms.push(room);
  }
  await storeSet('createdRooms', rooms);
}

export async function deleteCreatedRoom(roomKey: string): Promise<void> {
  const rooms = await getCreatedRooms();
  const updated = rooms.filter((r) => r.roomKey !== roomKey && r.roomName !== roomKey);
  await storeSet('createdRooms', updated);
}

// Joined Rooms (Client)
export async function getJoinedRooms(): Promise<RoomRecord[]> {
  const rooms = await storeGet<RoomRecord[]>('joinedRooms', []);
  return Array.isArray(rooms) ? rooms : [];
}

export async function saveJoinedRoom(room: RoomRecord): Promise<void> {
  const rooms = await getJoinedRooms();
  const index = rooms.findIndex((r) => r.roomKey === room.roomKey || r.roomName === room.roomName);
  if (index !== -1) {
    rooms[index] = { ...rooms[index], ...room };
  } else {
    rooms.push(room);
  }
  await storeSet('joinedRooms', rooms);
}

export async function deleteJoinedRoom(roomKey: string): Promise<void> {
  const rooms = await getJoinedRooms();
  const updated = rooms.filter((r) => r.roomKey !== roomKey && r.roomName !== roomKey);
  await storeSet('joinedRooms', updated);
}

// App Settings
export async function getAppSettings(): Promise<AppSettings> {
  const stored = await storeGet<Partial<AppSettings>>('settings', {});
  return {
    ...DEFAULT_SETTINGS,
    ...(stored || {}),
  };
}

export async function saveAppSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const updated = {
    ...current,
    ...newSettings,
  };
  await storeSet('settings', updated);
  return updated;
}
