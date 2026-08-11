import Dexie, { Table } from 'dexie';

interface RoomRegistryEntry {
  roomKey: string;
  updatedAt: string;
}

class RoomRegistryDatabase extends Dexie {
  savedRooms!: Table<RoomRegistryEntry, string>;

  constructor() {
    super('VidThyncRoomRegistry');
    this.version(1).stores({
      savedRooms: 'roomKey, updatedAt',
    });
  }
}

const db = new RoomRegistryDatabase();

/**
 * Upsert a room key entry into the local IndexedDB registry.
 */
export async function upsertRoomRegistry(roomKey: string): Promise<void> {
  try {
    await db.savedRooms.put({
      roomKey,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[RoomRegistryStorage] Failed to upsert room registry entry:',
      error,
    );
    throw error;
  }
}

/**
 * Get all saved room keys from the local IndexedDB registry.
 */
export async function getRoomRegistryKeys(): Promise<string[]> {
  try {
    const records = await db.savedRooms.toArray();
    return records.map((r) => r.roomKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[RoomRegistryStorage] Failed to fetch room registry keys:',
      error,
    );
    return [];
  }
}

/**
 * Remove a room key entry from the local IndexedDB registry.
 */
export async function removeFromRoomRegistry(roomKey: string): Promise<void> {
  try {
    await db.savedRooms.delete(roomKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[RoomRegistryStorage] Failed to remove room registry entry:',
      error,
    );
    throw error;
  }
}
