import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
  import { pauseFolder, unPauseFolder} from 'src/syncthing/API';


export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type ConnectionState = {
  status: ConnectionStatus;
  roomName: string | null;
  signalingUrl: string | null;
  peersConnected: number;
  isHost: boolean;
  error: string | null;
};

export type ConnectionConfig = {
  roomName: string;
  signalingUrl: string;
  signalingPort: string;
  isHost: boolean;
};

export type StoredRoomConfig = {
  isHost: boolean;
  roomName: string;
  roomKey: string;
  signalingUrl: string;
  signalingPort: string;
  filePath: string;
  deviceID: string;
  description: string;
  hostDeviceId: string;
  hostPort: string;
  connectionMode: 'direct' | 'dynamic' | '';
  createdAt: string;
};

type ConnectionListener = (state: ConnectionState) => void;
const SAVED_ROOMS_REGISTRY = '__videothync_saved_rooms__';

/**
 * Singleton class to manage YJS/WebRTC connections.
 * Ensures only ONE active connection exists at a time.
 */
// eslint-disable-next-line @typescript-eslint/no-use-before-define
class YjsConnectionManager {
  private static instance: YjsConnectionManager | null = null;

  private ydoc: Y.Doc | null = null;
  private idb: IndexeddbPersistence | null = null;

  private webrtc: WebrtcProvider | null = null;

  private currentState: ConnectionState = {
    status: 'disconnected',
    roomName: null,
    signalingUrl: null,
    peersConnected: 0,
    isHost: false,
    error: null,
  };

  private listeners: Set<ConnectionListener> = new Set();

  private constructor() {
    // Private constructor to prevent direct instantiation
    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] Initialized');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): YjsConnectionManager {
    if (!YjsConnectionManager.instance) {
      YjsConnectionManager.instance = new YjsConnectionManager();
    }
    return YjsConnectionManager.instance;
  }

  /**
   * Subscribe to connection state changes
   */
  public subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.currentState);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify all listeners
   */
  private setState(updates: Partial<ConnectionState>): void {
    this.currentState = { ...this.currentState, ...updates };
    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] State updated:', this.currentState);

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[YjsConnectionManager] Listener error:', error);
      }
    });
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return { ...this.currentState };
  }

  /**
   * Get the current YDoc (if connected)
   */
  public getYDoc(): Y.Doc | null {
    return this.ydoc;
  }

  /**
   * Persist the current room configuration inside the Y.Doc so it is stored
   * by y-indexeddb and can be restored later.
   */
  public async saveRoomConfig(config: StoredRoomConfig): Promise<void> {
    if (!this.ydoc || !this.idb) {
      throw new Error('Cannot save room config before the room is connected');
    }

    const roomConfig = this.ydoc.getMap<unknown>('roomConfig');

    roomConfig.clear();
    roomConfig.set('isHost', config.isHost);
    roomConfig.set('roomName', config.roomName);
    roomConfig.set('roomKey', config.roomKey);
    roomConfig.set('signalingUrl', config.signalingUrl);
    roomConfig.set('signalingPort', config.signalingPort);
    roomConfig.set('filePath', config.filePath);
    roomConfig.set('deviceID', config.deviceID);
    roomConfig.set('description', config.description);
    roomConfig.set('hostDeviceId', config.hostDeviceId);
    roomConfig.set('hostPort', config.hostPort);
    roomConfig.set('connectionMode', config.connectionMode);
    roomConfig.set('createdAt', config.createdAt);

    await this.idb.whenSynced;
    await this.upsertSavedRoomRegistryEntry(config.roomKey);

    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] Room config saved to IndexedDB');
  }

  /**
   * Keep a small registry of known room keys so we can list all saved rooms.
   */
  private async upsertSavedRoomRegistryEntry(roomKey: string): Promise<void> {
    const registryDoc = new Y.Doc();
    const registryIdb = new IndexeddbPersistence(SAVED_ROOMS_REGISTRY, registryDoc);

    try {
      await registryIdb.whenSynced;
      const savedRooms = registryDoc.getMap<string>('savedRooms');
      savedRooms.set(roomKey, new Date().toISOString());
      await registryIdb.whenSynced;
    } finally {
      await registryIdb.destroy();
      registryDoc.destroy();
    }
  }

  /**
   * Return all room configs that were previously persisted.
   */
  public async listSavedRoomConfigs(): Promise<StoredRoomConfig[]> {
    const registryDoc = new Y.Doc();
    const registryIdb = new IndexeddbPersistence(SAVED_ROOMS_REGISTRY, registryDoc);

    try {
      await registryIdb.whenSynced;

      const savedRooms = registryDoc.getMap<string>('savedRooms');
      const roomKeys = Array.from(savedRooms.keys());

      const loadedConfigs = await Promise.all(
        roomKeys.map(async (roomKey) => {
          try {
            return await this.loadRoomConfig(roomKey);
          } catch {
            return null;
          }
        }),
      );

      return loadedConfigs
        .filter((config): config is StoredRoomConfig => config !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } finally {
      await registryIdb.destroy();
      registryDoc.destroy();
    }
  }

  /**
   * Load the persisted room config for a room from IndexedDB.
   */
  public async loadRoomConfig(
    roomName: string,
  ): Promise<StoredRoomConfig | null> {
    const tempDoc = new Y.Doc();
    const tempIdb = new IndexeddbPersistence(roomName, tempDoc);

    try {
      await tempIdb.whenSynced;

      const roomConfig = tempDoc.getMap<unknown>('roomConfig');
      if (roomConfig.size === 0) {
        return null;
      }

      const isHostValue = roomConfig.get('isHost');
      const legacyType = roomConfig.get('type') as string | undefined;
      const isHost =
        typeof isHostValue === 'boolean'
          ? isHostValue
          : legacyType === 'host'
            ? true
            : legacyType === 'peer'
              ? false
              : undefined;
      const storedRoomName = roomConfig.get('roomName') as string | undefined;
      const roomKey = roomConfig.get('roomKey') as string | undefined;
      const signalingUrl = roomConfig.get('signalingUrl') as
        | string
        | undefined;
      const signalingPort = roomConfig.get('signalingPort') as
        | string
        | undefined;
      const filePath = roomConfig.get('filePath') as string | undefined;
      const deviceID = roomConfig.get('deviceID') as string | undefined;
      const description =
        (roomConfig.get('description') as string | undefined) ?? '';
      const hostDeviceId =
        (roomConfig.get('hostDeviceId') as string | undefined) ?? '';
      const hostPort = (roomConfig.get('hostPort') as string | undefined) ?? '';
      const connectionMode =
        (roomConfig.get('connectionMode') as
          | 'direct'
          | 'dynamic'
          | undefined) ?? '';
      const createdAt =
        (roomConfig.get('createdAt') as string | undefined) ??
        new Date().toISOString();

      if (
        typeof isHost !== 'boolean' ||
        !storedRoomName ||
        !roomKey ||
        !signalingUrl ||
        !signalingPort ||
        !filePath ||
        !deviceID
      ) {
        return null;
      }

      return {
        isHost,
        roomName: storedRoomName,
        roomKey,
        signalingUrl,
        signalingPort,
        filePath,
        deviceID,
        description,
        hostDeviceId,
        hostPort,
        connectionMode,
        createdAt,
      };
    } finally {
      await tempIdb.destroy();
      tempDoc.destroy();
    }
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.currentState.status === 'connected';
  }

  /**
   * Connect to a room. Automatically disconnects from any existing connection first.
   */
  public async connect(config: ConnectionConfig): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] Connect requested:', config);
    // Disconnect from any existing connection first
    if (this.isConnected() || this.currentState.status === 'connecting') {
      // eslint-disable-next-line no-console
      console.log(
        '[YjsConnectionManager] Disconnecting from existing connection...',
      );
      await this.disconnect();
    }

    try {
      this.setState({
        status: 'connecting',
        roomName: config.roomName,
        signalingUrl: `ws://${config.signalingUrl}:${config.signalingPort}`,
        isHost: config.isHost,
        error: null,
        peersConnected: 0,
      });
      unPauseFolder(this.currentState.roomName ?? "")
      // Create new YDoc
      this.ydoc = new Y.Doc();
      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] Created new YDoc');

      // Setup IndexedDB persistence
      this.idb = new IndexeddbPersistence(config.roomName, this.ydoc);
      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] IndexedDB persistence initialized');

      // Wait for IndexedDB to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('IndexedDB initialization timeout'));
        }, 10000);

        this.idb!.on('synced', () => {
          clearTimeout(timeout);
          // eslint-disable-next-line no-console
          console.log('[YjsConnectionManager] IndexedDB synced');
          resolve();
        });
      });

      // Setup WebRTC connection
      const signalingURL = `ws://${config.signalingUrl}:${config.signalingPort}`;
      this.webrtc = new WebrtcProvider(config.roomName, this.ydoc, {
        signaling: [signalingURL],
      });
      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] WebRTC provider created');

      // Setup WebRTC event listeners
      this.setupWebRTCListeners();

      // Update state to connected
      this.setState({
        status: 'connected',
      });

      // eslint-disable-next-line no-console
      console.log(
        '[YjsConnectionManager] Successfully connected to room:',
        config.roomName,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsConnectionManager] Connection error:', error);

      // Clean up on error
      await this.cleanup();

      this.setState({
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Unknown connection error',
      });

      throw error;
    }
  }

  /**
   * Setup WebRTC event listeners
   */
  private setupWebRTCListeners(): void {
    if (!this.webrtc) return;

    this.webrtc.on('status', (event: { connected: boolean }) => {
      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] WebRTC status:', event);
    });

    this.webrtc.on('synced', (event: { synced: boolean }) => {
      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] WebRTC synced:', event.synced);
    });

    this.webrtc.on(
      'peers',
      (event: {
        added: string[];
        removed: string[];
        webrtcPeers: string[];
      }) => {
        // eslint-disable-next-line no-console
        console.log('[YjsConnectionManager] Peers changed:', {
          added: event.added,
          removed: event.removed,
          total: event.webrtcPeers.length,
        });

        this.setState({
          peersConnected: event.webrtcPeers.length,
        });
      },
    );
  }

  /**
   * Disconnect from current room and clean up resources
   */
  public async disconnect(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] Disconnecting...');

    if (this.currentState.status === 'disconnected') {
      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] Already disconnected');
      return;
    }

    try {
      await this.cleanup();

      this.setState({
        status: 'disconnected',
        roomName: null,
        signalingUrl: null,
        peersConnected: 0,
        isHost: false,
        error: null,
      });

      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] Disconnected successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsConnectionManager] Error during disconnect:', error);
      throw error;
    }
  }

  /**
   * Clean up all resources
   */
  private async cleanup(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] Cleaning up resources...');

      pauseFolder(this.currentState.roomName ?? "")



    // Destroy WebRTC provider
    if (this.webrtc) {
      try {
        this.webrtc.destroy();
        // eslint-disable-next-line no-console
        console.log('[YjsConnectionManager] WebRTC provider destroyed');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[YjsConnectionManager] Error destroying WebRTC:', error);
      }
      this.webrtc = null;
    }

    // Destroy IndexedDB persistence
    if (this.idb) {
      try {
        await this.idb.destroy();
        // eslint-disable-next-line no-console
        console.log('[YjsConnectionManager] IndexedDB destroyed');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          '[YjsConnectionManager] Error destroying IndexedDB:',
          error,
        );
      }
      this.idb = null;
    }

    // Destroy YDoc
    if (this.ydoc) {
      try {
        this.ydoc.destroy();
        // eslint-disable-next-line no-console
        console.log('[YjsConnectionManager] YDoc destroyed');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[YjsConnectionManager] Error destroying YDoc:', error);
      }
      this.ydoc = null;
    }
  }

  /**
   * Clear IndexedDB data for a specific room
   */
  public async clearRoomData(roomName: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[YjsConnectionManager] Clearing data for room:', roomName);

    // Don't clear if currently connected to this room
    if (this.currentState.roomName === roomName && this.isConnected()) {
      throw new Error(
        'Cannot clear data for currently connected room. Disconnect first.',
      );
    }

    try {
      // Create temporary instances just to clear the data
      const tempDoc = new Y.Doc();
      const tempIdb = new IndexeddbPersistence(roomName, tempDoc);

      await new Promise<void>((resolve) => {
        tempIdb.on('synced', async () => {
          await tempIdb.clearData();
          await tempIdb.destroy();
          tempDoc.destroy();
          resolve();
        });
      });

      // eslint-disable-next-line no-console
      console.log('[YjsConnectionManager] Room data cleared:', roomName);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsConnectionManager] Error clearing room data:', error);
      throw error;
    }
  }

  /**
   * Reconnect to the current room (useful after network issues)
   */
  public async reconnect(): Promise<void> {
    const currentConfig = {
      roomName: this.currentState.roomName,
      signalingUrl: this.currentState.signalingUrl
        ?.replace('ws://', '')
        .split(':')[0],
      signalingPort: this.currentState.signalingUrl?.split(':')[2],
      isHost: this.currentState.isHost,
    };

    if (
      !currentConfig.roomName ||
      !currentConfig.signalingUrl ||
      !currentConfig.signalingPort
    ) {
      throw new Error('Cannot reconnect: no previous connection information');
    }

    await this.connect(currentConfig as ConnectionConfig);
  }
}

// Export singleton instance
export const connectionManager = YjsConnectionManager.getInstance();

// Export the class for testing purposes
export default YjsConnectionManager;
