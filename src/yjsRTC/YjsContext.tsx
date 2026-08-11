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
  StoredRoomConfig,
} from './ConnectionManager';

interface YjsContextValue {
  state: ConnectionState;
  connect: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  clearRoomData: (roomName: string) => Promise<void>;
  saveRoomConfig: (config: StoredRoomConfig) => Promise<void>;
  loadRoomConfig: (roomName: string) => Promise<StoredRoomConfig | null>;
  listSavedRoomConfigs: () => Promise<StoredRoomConfig[]>;
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

  const saveRoomConfig = useCallback(async (config: StoredRoomConfig) => {
    try {
      await connectionManager.saveRoomConfig(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] Save room config failed:', error);
      throw error;
    }
  }, []);

  const loadRoomConfig = useCallback(async (roomName: string) => {
    try {
      return await connectionManager.loadRoomConfig(roomName);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] Load room config failed:', error);
      throw error;
    }
  }, []);

  const listSavedRoomConfigs = useCallback(async () => {
    try {
      return await connectionManager.listSavedRoomConfigs();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[YjsProvider] List saved room configs failed:', error);
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
      saveRoomConfig,
      loadRoomConfig,
      listSavedRoomConfigs,
      getYDoc,
      isConnected: state.status === 'connected',
    }),
    [
      state,
      connect,
      disconnect,
      reconnect,
      clearRoomData,
      saveRoomConfig,
      loadRoomConfig,
      listSavedRoomConfigs,
      getYDoc,
    ],
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

/**
 * Hook to observe a YJS Text type
 * Returns the text content as a string and methods to manipulate it
 */
export const useYText = (textName: string) => {
  const ydoc = useYDoc();
  const [text, setText] = useState<string>('');
  const textRef = React.useRef<string>('');

  useEffect(() => {
    if (!ydoc) {
      setText('');
      textRef.current = '';
      return;
    }

    const ytext = ydoc.getText(textName);

    const observer = () => {
      const newText = ytext.toString();
      setText(newText);
      textRef.current = newText;
    };

    // Initial text
    observer();

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
      return undefined;
    };
  }, [ydoc, textName]);

  // Memoize the manipulation methods
  const methods = useMemo(() => {
    if (!ydoc) {
      return {
        insert: () => {},
        delete: () => {},
        format: () => {},
        toDelta: () => [],
        toString: () => '',
        onChange: () => {},
        setValue: () => {},
      };
    }

    const ytext = ydoc.getText(textName);

    return {
      /**
       * Insert text at a specific position
       * @param index - Position to insert at
       * @param content - Text to insert
       * @param attributes - Optional formatting attributes
       */
      insert: (
        index: number,
        content: string,
        attributes?: Record<string, any>,
      ) => {
        if (attributes) {
          ytext.insert(index, content, attributes);
        } else {
          ytext.insert(index, content);
        }
      },

      /**
       * Delete text from a specific position
       * @param index - Starting position
       * @param length - Number of characters to delete
       */
      delete: (index: number, length: number) => {
        ytext.delete(index, length);
      },

      /**
       * Format text in a range
       * @param index - Starting position
       * @param length - Number of characters to format
       * @param attributes - Formatting attributes (e.g., { bold: true })
       */
      format: (
        index: number,
        length: number,
        attributes: Record<string, any>,
      ) => {
        ytext.format(index, length, attributes);
      },

      /**
       * Get Delta representation of the text
       */
      toDelta: () => ytext.toDelta(),

      /**
       * Get string representation of the text
       */
      toString: () => ytext.toString(),

      /**
       * React-friendly onChange handler for input/textarea elements
       * Use this with: <input value={text} onChange={onChange} />
       */
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        const newValue = e.target.value;
        const oldValue = textRef.current;

        if (newValue === oldValue) return;

        // Calculate the difference and apply minimal changes
        if (newValue.length > oldValue.length) {
          // Text was inserted
          let insertPos = 0;
          // Find where the insertion happened
          for (let i = 0; i < oldValue.length; i++) {
            if (oldValue[i] !== newValue[i]) {
              insertPos = i;
              break;
            }
          }
          // If all existing chars match, insertion is at the end
          if (
            insertPos === 0 &&
            oldValue.length > 0 &&
            oldValue[0] === newValue[0]
          ) {
            insertPos = oldValue.length;
          }
          const insertedText = newValue.slice(
            insertPos,
            insertPos + (newValue.length - oldValue.length),
          );
          ytext.insert(insertPos, insertedText);
        } else if (newValue.length < oldValue.length) {
          // Text was deleted
          let deletePos = 0;
          // Find where the deletion happened
          for (let i = 0; i < newValue.length; i++) {
            if (oldValue[i] !== newValue[i]) {
              deletePos = i;
              break;
            }
          }
          // If all remaining chars match, deletion is at the end
          if (
            deletePos === 0 &&
            newValue.length > 0 &&
            oldValue[0] === newValue[0]
          ) {
            deletePos = newValue.length;
          }
          const deleteCount = oldValue.length - newValue.length;
          ytext.delete(deletePos, deleteCount);
        } else {
          // Text was replaced (same length but different content)
          // Clear and reinsert
          ytext.delete(0, oldValue.length);
          ytext.insert(0, newValue);
        }
      },

      /**
       * Set the entire text content (replaces all text)
       * @param newText - The new text content
       */
      setValue: (newText: string) => {
        const currentLength = ytext.length;
        if (currentLength > 0) {
          ytext.delete(0, currentLength);
        }
        if (newText.length > 0) {
          ytext.insert(0, newText);
        }
      },
    };
  }, [ydoc, textName]);

  return {
    text,
    ...methods,
  };
};
