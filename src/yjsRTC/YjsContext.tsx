import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import * as Y from 'yjs';
import {
  connectionManager,
  ConnectionState,
  ConnectionConfig,
} from './ConnectionManager';

interface YjsContextValue {
  state: ConnectionState;
  connect: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  clearRoomData: (roomName: string) => Promise<void>;
  getYDoc: () => Y.Doc | null;
  isConnected: boolean;
}

const YjsContext = createContext<YjsContextValue | null>(null);

export function YjsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>(
    connectionManager.getState(),
  );

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribe = connectionManager.subscribe((newState) => {
      setState(newState);
    });

    // Cleanup on unmount - disconnect from room
    return () => {
      unsubscribe();
      // Note: We intentionally don't disconnect here to allow the connection
      // to persist across component remounts. Users must explicitly disconnect.
    };
  }, []);

  const connect = useCallback(async (config: ConnectionConfig) => {
    try {
      await connectionManager.connect(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] Connection failed:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await connectionManager.disconnect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] Disconnect failed:', error);
      throw error;
    }
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await connectionManager.reconnect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] Reconnect failed:', error);
      throw error;
    }
  }, []);

  const clearRoomData = useCallback(async (roomName: string) => {
    try {
      await connectionManager.clearRoomData(roomName);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] Clear room data failed:', error);
      throw error;
    }
  }, []);

  const getYDoc = useCallback(() => {
    return connectionManager.getYDoc();
  }, []);

  const value: YjsContextValue = useMemo(
    () => ({
      state,
      connect,
      disconnect,
      reconnect,
      clearRoomData,
      getYDoc,
      isConnected: state.status === 'connected',
    }),
    [state, connect, disconnect, reconnect, clearRoomData, getYDoc],
  );

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>;
}

/**
 * Hook to access YJS connection manager
 */
export const useYjs = (): YjsContextValue => {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjs must be used within a YjsProvider');
  }
  return context;
};

/**
 * Hook to get the current YDoc
 */
export const useYDoc = (): Y.Doc | null => {
  const { getYDoc } = useYjs();
  const [ydoc, setYdoc] = useState<Y.Doc | null>(getYDoc());

  useEffect(() => {
    // Update ydoc whenever connection state changes
    const interval = setInterval(() => {
      const currentYdoc = getYDoc();
      setYdoc(currentYdoc);
    }, 100);

    return () => clearInterval(interval);
  }, [getYDoc]);

  return ydoc;
};

/**
 * Hook to observe a YJS shared type
 */
export const useYMap = <T extends Record<string, any>>(mapName: string): T => {
  const ydoc = useYDoc();
  const [data, setData] = useState<T>({} as T);

  useEffect(() => {
    if (!ydoc) {
      setData({} as T);
      return;
    }

    const ymap = ydoc.getMap(mapName);

    const observer = () => {
      const newData: any = {};
      ymap.forEach((value, key) => {
        newData[key] = value;
      });
      setData(newData);
    };

    // Initial data
    observer();

    ymap.observe(observer);

    return () => {
      ymap.unobserve(observer);
      return undefined;
    };
  }, [ydoc, mapName]);

  return data;
};

/**
 * Hook to observe a YJS array
 */
export const useYArray = <T,>(arrayName: string): T[] => {
  const ydoc = useYDoc();
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!ydoc) {
      setData([]);
      return;
    }

    const yarray = ydoc.getArray<T>(arrayName);

    const observer = () => {
      setData(yarray.toArray());
    };

    // Initial data
    observer();

    yarray.observe(observer);

    return () => {
      yarray.unobserve(observer);
      return undefined;
    };
  }, [ydoc, arrayName]);

  return data;
};
