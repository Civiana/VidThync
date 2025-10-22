# YJS Connection Management Architecture

This directory contains the centralized YJS/WebRTC connection management system for VideoThync. The architecture ensures that **only ONE YJS room connection exists at a time**, preventing state conflicts and memory leaks.

## 🏗️ Architecture Overview

### Core Components

1. **ConnectionManager.ts** - Singleton class managing YJS/WebRTC connections
2. **YjsContext.tsx** - React Context and hooks for component integration
3. **setup.ts** - Legacy setup functions (deprecated, kept for reference)
4. **provider.ts** - Legacy provider helper (deprecated, kept for reference)

## 🔑 Key Principles

- **Single Connection**: Only one active room connection at any time
- **Automatic Cleanup**: Previous connections are automatically destroyed when creating new ones
- **State Management**: Centralized, observable connection state
- **Type Safety**: Full TypeScript support with proper typing
- **Error Handling**: Comprehensive error handling and recovery

## 📦 Components

### ConnectionManager (Singleton)

The core singleton class that manages YJS documents, IndexedDB persistence, and WebRTC providers.

```typescript
import { connectionManager } from 'src/yjsRTC/ConnectionManager';

// Get current state
const state = connectionManager.getState();

// Connect to a room (automatically disconnects from any existing connection)
await connectionManager.connect({
  roomName: 'my-room',
  signalingUrl: 'localhost',
  signalingPort: '4444',
  isHost: true
});

// Disconnect
await connectionManager.disconnect();

// Subscribe to state changes
const unsubscribe = connectionManager.subscribe((state) => {
  console.log('Connection state:', state);
});

// Get the YDoc
const ydoc = connectionManager.getYDoc();
```

### YjsProvider & Hooks

React integration using Context API.

#### Setup

Wrap your app with `YjsProvider`:

```typescript
import { YjsProvider } from 'src/yjsRTC/YjsContext';

function App() {
  return (
    <YjsProvider>
      <YourApp />
    </YjsProvider>
  );
}
```

#### useYjs Hook

Main hook for connection management:

```typescript
import { useYjs } from 'src/yjsRTC/YjsContext';

function MyComponent() {
  const { 
    state,        // Current connection state
    connect,      // Connect to a room
    disconnect,   // Disconnect from current room
    reconnect,    // Reconnect to current room
    getYDoc,      // Get the current YDoc
    isConnected   // Boolean connection status
  } = useYjs();

  const handleConnect = async () => {
    await connect({
      roomName: 'my-room',
      signalingUrl: '192.168.1.100',
      signalingPort: '4444',
      isHost: false
    });
  };

  return (
    <div>
      <p>Status: {state.status}</p>
      <p>Room: {state.roomName}</p>
      <p>Peers: {state.peersConnected}</p>
      <button onClick={handleConnect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

#### useYDoc Hook

Get the current YDoc, automatically updated:

```typescript
import { useYDoc } from 'src/yjsRTC/YjsContext';

function MyComponent() {
  const ydoc = useYDoc();

  useEffect(() => {
    if (!ydoc) return;

    const ymap = ydoc.getMap('my-data');
    ymap.set('key', 'value');
  }, [ydoc]);
}
```

#### useYMap Hook

Observe a YJS Map with React state:

```typescript
import { useYMap } from 'src/yjsRTC/YjsContext';

function MyComponent() {
  const data = useYMap<{ count: number }>('my-map');

  return <div>Count: {data.count || 0}</div>;
}
```

#### useYArray Hook

Observe a YJS Array with React state:

```typescript
import { useYArray } from 'src/yjsRTC/YjsContext';

function MyComponent() {
  const items = useYArray<string>('my-array');

  return (
    <ul>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}
```

#### useYText Hook

Observe and manipulate a YJS Text with React state:

```typescript
import { useYText } from 'src/yjsRTC/YjsContext';

function MyComponent() {
  const { text, onChange, insert, delete: deleteText, format, toDelta, setValue } = useYText('my-text');

  // Method 1: Use the built-in onChange handler (recommended)
  return (
    <div>
      <input 
        type="text"
        value={text} 
        onChange={onChange} // Works automatically with React inputs!
        placeholder="Type here..."
      />
      <textarea
        value={text}
        onChange={onChange} // Also works with textareas!
        placeholder="Collaborative text..."
      />
    </div>
  );
}

// Method 2: Manual manipulation
function AdvancedComponent() {
  const { text, insert, delete: deleteText, format, toDelta, setValue } = useYText('my-text');

  const handleBold = () => {
    // Format characters 0-5 as bold
    format(0, 5, { bold: true });
  };

  const handleInsert = () => {
    // Insert text at position 0
    insert(0, 'Hello ');
  };

  const handleClear = () => {
    // Replace entire text content
    setValue('');
  };

  return (
    <div>
      <p>{text}</p>
      <button onClick={handleInsert}>Insert</button>
      <button onClick={handleBold}>Make Bold</button>
      <button onClick={handleClear}>Clear</button>
      <pre>{JSON.stringify(toDelta(), null, 2)}</pre>
    </div>
  );
}
```

## 📊 Connection State

The connection state includes:

```typescript
type ConnectionState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  roomName: string | null;
  signalingUrl: string | null;
  peersConnected: number;
  isHost: boolean;
  error: string | null;
};
```

## 🔄 Connection Lifecycle

### Creating a Room (Host)

```typescript
const { connect } = useYjs();

await connect({
  roomName: 'my-awesome-room',
  signalingUrl: 'localhost',
  signalingPort: '4444',
  isHost: true
});
```

**What happens:**
1. Any existing connection is automatically disconnected
2. New YDoc is created
3. IndexedDB persistence is initialized
4. WebRTC provider connects to signaling server
5. State updates to 'connected'

### Joining a Room (Client)

```typescript
const { connect } = useYjs();

await connect({
  roomName: 'my-awesome-room',
  signalingUrl: '192.168.1.100',
  signalingPort: '4444',
  isHost: false
});
```

**What happens:**
1. Any existing connection is automatically disconnected
2. Connects to host's signaling server
3. Syncs with host's YDoc via WebRTC
4. Loads local IndexedDB cache (if exists)
5. State updates to 'connected'

### Disconnecting

```typescript
const { disconnect } = useYjs();

await disconnect();
```

**What happens:**
1. WebRTC provider destroyed
2. IndexedDB persistence destroyed
3. YDoc destroyed
4. State updates to 'disconnected'

## 🐛 Debug Component

The `DebugYjs` component provides real-time monitoring:

```typescript
import DebugYjs from 'src/components/DebugYjs';

// Place anywhere in your app (already in App.tsx)
<DebugYjs />
```

**Features:**
- Current connection status
- Room name and signaling URL
- Number of connected peers
- Host/Client role indicator
- Quick disconnect/reconnect buttons
- Minimizable floating window

## ⚠️ Important Notes

### Single Connection Enforcement

The system **automatically disconnects** from the previous room when connecting to a new one. This prevents:
- Multiple active WebRTC connections
- Conflicting IndexedDB persistence
- Memory leaks
- State synchronization issues

### Component Unmounting

Connections **persist** across component unmounts. Users must explicitly disconnect via:
- The DebugYjs disconnect button
- Calling `disconnect()` in code
- Connecting to a different room (auto-disconnects previous)

### IndexedDB Persistence

Each room has its own IndexedDB database:
- Data persists across page reloads
- Syncs automatically when reconnecting to the same room
- Can be cleared with `clearRoomData(roomName)`

### Error Handling

Always wrap connection calls in try-catch:

```typescript
try {
  await connect(config);
} catch (error) {
  console.error('Connection failed:', error);
  // Handle error (show toast, alert, etc.)
}
```

## 🔧 Migration from Old System

### Before (DON'T DO THIS)

```typescript
// ❌ Old way - multiple instances, no coordination
const envRef = useRef<YEnvironment | null>(null);
envRef.current = createYEnvironment(roomName, url, port);
```

### After (DO THIS)

```typescript
// ✅ New way - centralized management
const { connect, getYDoc } = useYjs();
await connect({ roomName, signalingUrl, signalingPort, isHost });
const ydoc = getYDoc();
```

## 📝 Examples

### Example 1: Simple Connection Test

```typescript
function TestComponent() {
  const { connect, disconnect, state, isConnected } = useYjs();

  return (
    <div>
      <p>Status: {state.status}</p>
      {!isConnected ? (
        <button onClick={() => connect({
          roomName: 'test',
          signalingUrl: 'localhost',
          signalingPort: '4444',
          isHost: true
        })}>
          Connect
        </button>
      ) : (
        <button onClick={disconnect}>Disconnect</button>
      )}
    </div>
  );
}
```

### Example 2: Shared Counter

```typescript
function SharedCounter() {
  const ydoc = useYDoc();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ydoc) return;

    const ymap = ydoc.getMap('counter');
    setCount(ymap.get('value') || 0);

    const observer = () => {
      setCount(ymap.get('value') || 0);
    };

    ymap.observe(observer);
    return () => ymap.unobserve(observer);
  }, [ydoc]);

  const increment = () => {
    if (!ydoc) return;
    const ymap = ydoc.getMap('counter');
    ymap.set('value', (ymap.get('value') || 0) + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}
```

### Example 3: Connection Guard

```typescript
function ProtectedComponent() {
  const { isConnected, state } = useYjs();

  if (!isConnected) {
    return <div>Please connect to a room first</div>;
  }

  if (state.status === 'connecting') {
    return <div>Connecting to {state.roomName}...</div>;
  }

  return <div>Connected! Do your thing...</div>;
}
```

### Example 4: Collaborative Text Editor (Simple)

```typescript
function CollaborativeEditor() {
  const { text, onChange } = useYText('document');

  // That's it! The onChange handler does all the work
  return (
    <div>
      <h3>Collaborative Document</h3>
      <textarea 
        value={text} 
        onChange={onChange} // Automatically syncs with other users!
        placeholder="Start typing... changes sync in real-time"
        rows={10}
        cols={50}
      />
      <p className="text-sm text-gray-500">
        Open this on another device to see live collaboration
      </p>
    </div>
  );
}
```

### Example 5: Rich Text Editor with Formatting

```typescript
function RichTextEditor() {
  const { text, onChange, format, toDelta, setValue } = useYText('rich-document');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const handleSelect = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSelection({
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
    });
  };

  const applyFormat = (formatType: string) => {
    if (selection.end > selection.start) {
      format(selection.start, selection.end - selection.start, { [formatType]: true });
    }
  };

  const handleClear = () => {
    setValue('');
  };

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => applyFormat('bold')}>Bold</button>
        <button onClick={() => applyFormat('italic')}>Italic</button>
        <button onClick={() => applyFormat('underline')}>Underline</button>
        <button onClick={handleClear}>Clear All</button>
      </div>
      <textarea 
        value={text} 
        onChange={onChange}
        onSelect={handleSelect}
        placeholder="Select text and apply formatting..."
        rows={10}
        cols={50}
      />
      <div className="preview">
        <h4>Delta (with formatting):</h4>
        <pre>{JSON.stringify(toDelta(), null, 2)}</pre>
      </div>
    </div>
  );
}
```

### Example 6: Chat Application

```typescript
function ChatInput() {
  const { text, onChange, setValue } = useYText('chat-input');
  const messages = useYArray<string>('messages');
  const ydoc = useYDoc();

  const handleSend = () => {
    if (text.trim()) {
      // Add message to shared array
      const messagesArray = ydoc?.getArray('messages');
      messagesArray?.push([text]);
      // Clear input
      setValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">{msg}</div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={text}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
```

## 🧪 Testing

To test the single-connection enforcement:

1. Connect to Room A
2. Try connecting to Room B
3. Room A will automatically disconnect
4. Room B connection will be established
5. Check DebugYjs panel to verify only one connection

## 📚 Additional Resources

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-webrtc Provider](https://github.com/yjs/y-webrtc)
- [y-indexeddb Persistence](https://github.com/yjs/y-indexeddb)

---
