import Dexie, { Table } from 'dexie';

// Interface for API key storage
interface ApiKeyRecord {
  id?: number;
  key: string;
  updatedAt: Date;
}

// Dexie database for storing API keys
class ApiKeyDatabase extends Dexie {
  apiKeys!: Table<ApiKeyRecord>;

  constructor() {
    super('VidThyncSettings');
    this.version(1).stores({
      apiKeys: '++id, key, updatedAt',
    });
  }
}

const db = new ApiKeyDatabase();

// Save the Syncthing API key
export async function saveSyncthingApiKey(apiKey: string): Promise<void> {
  try {
    // Clear any existing keys first (we only want one)
    await db.apiKeys.clear();

    // Save the new key
    await db.apiKeys.add({
      key: apiKey,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error saving Syncthing API key:', error);
    throw error;
  }
}

// Load the Syncthing API key
export async function loadSyncthingApiKey(): Promise<string | null> {
  try {
    // Get the most recent API key
    const record = await db.apiKeys.orderBy('updatedAt').last();
    return record?.key || null;
  } catch (error) {
    console.error('Error loading Syncthing API key:', error);
    return null;
  }
}

// Clear the stored API key
export async function clearSyncthingApiKey(): Promise<void> {
  try {
    await db.apiKeys.clear();
  } catch (error) {
    console.error('Error clearing Syncthing API key:', error);
    throw error;
  }
}
