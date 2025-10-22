# YJS Connection Management - Redesign Complete ✅

## 🎯 Overview

The YJS/WebRTC connection system has been completely redesigned to address state management issues, prevent crashes, and ensure **only ONE active connection exists at a time**.

## ✨ What's New

### Before (Old System - DEPRECATED)
```typescript
// ❌ Multiple instances, no coordination, memory leaks
const envRef = useRef<YEnvironment | null>(null);
envRef.current = createYEnvironment(roomName, url, port);

// Manual cleanup required
destroyYEnvironment(envRef.current);
```

### After (New System - USE THIS)
```typescript
// ✅ Centralized, automatic cleanup, single connection
const { connect, disconnect, state, getYDoc } = useYjs();

await connect({
  roomName: 'my-room',
  signalingUrl: 'localhost',
  signalingPort: '4444',
  isHost: true
});

// Cleanup is automatic when connecting to a new room!
```

## 📁 New Architecture

### Core Files Created

1. **`src/yjsRTC/ConnectionManager.ts`**
   - Singleton class managing all YJS connections
   - Ensures only one connection at a time
   - Automatic cleanup and state management

2. **`src/yjsRTC/YjsContext.tsx`**
   - React Context Provider
   - Custom hooks: `useYjs`, `useYDoc`, `useYMap`, `useYArray`
   - Easy integration with React components

3. **`src/components/DebugYjs.tsx`** (Updated)
   - Real-time connection monitoring
   - Shows status, room, peers, role
   - Quick disconnect/reconnect buttons
   - Floating minimizable window

4. **`src/yjsRTC/README.md`**
   - Complete documentation
   - API reference
   - Usage examples

### Files Updated

- **`src/renderer/App.tsx`** - Wrapped with `YjsProvider`
- **`src/screens/CreateRoom.tsx`** - Refactored to use new hooks
- **`src/screens/ConnectToRoom.tsx`** - Refactored to use new hooks
- **`src/components/TestConnection.tsx`** - Uses `useYDoc` hook

### Files Deprecated (Keep for reference)

- `src/yjsRTC/setup.ts` - Old setup functions
- `src/yjsRTC/provider.ts` - Old provider helper

## 🚀 Quick Start

### 1. The app is already wrapped with YjsProvider

```typescript
// src/renderer/App.tsx (already done)
import { YjsProvider } from '../yjsRTC/YjsContext';

export default function App() {
  return (
    <YjsProvider>
      <DebugYjs />
      {/* Your app */}
    </YjsProvider>
  );
}
```

### 2. Use the hooks in your components

```typescript
import { useYjs } from 'src/yjsRTC/YjsContext';

function MyComponent() {
  const { connect, disconnect, state, isConnected } = useYjs();

  const handleConnect = async () => {
    await connect({
      roomName: 'test-room',
      signalingUrl: 'localhost',
      signalingPort: '4444',
      isHost: true
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

## 🔑 Key Features

### ✅ Single Connection Enforcement

- **Automatic disconnect** when connecting to a new room
- **No more multiple instances** causing conflicts
- **Prevents memory leaks** and state issues

### ✅ Observable State

```typescript
const { state } = useYjs();

// state contains:
{
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  roomName: string | null,
  signalingUrl: string | null,
  peersConnected: number,
  isHost: boolean,
  error: string | null
}
```

### ✅ React Hooks

```typescript
// Main hook
const { connect, disconnect, reconnect, state, isConnected, getYDoc } = useYjs();

// Get YDoc directly
const ydoc = useYDoc();

// Observe a YMap with React state
const data = useYMap<{ count: number }>('my-map');

// Observe a YArray with React state
const items = useYArray<string>('my-array');
```

### ✅ Debug Panel

- Always visible in top-right corner
- Shows real-time connection status
- Minimizable when not needed
- Quick disconnect/reconnect actions

## 🔄 Migration Guide

### For CreateRoom Component

**Old Way:**
```typescript
const envRef = useRef<YEnvironment | null>(null);
envRef.current = createYEnvironment(roomName, 'localhost', signalingPort);
```

**New Way:**
```typescript
const { connect } = useYjs();
await connect({
  roomName,
  signalingUrl: 'localhost',
  signalingPort,
  isHost: true
});
```

### For ConnectToRoom Component

**Old Way:**
```typescript
envRef.current = createYEnvironment(roomName, url, domain);
if (envRef.current) {
  destroyYEnvironment(envRef.current);
}
```

**New Way:**
```typescript
const { connect, disconnect } = useYjs();

// Connect (automatically disconnects from previous room)
await connect({
  roomName,
  signalingUrl,
  signalingPort,
  isHost: false
});

// Disconnect when needed
await disconnect();
```

### For Accessing YDoc

**Old Way:**
```typescript
const ydoc = envRef.current?.ydoc;
if (ydoc) {
  const ymap = ydoc.getMap('data');
}
```

**New Way:**
```typescript
const ydoc = useYDoc();
if (ydoc) {
  const ymap = ydoc.getMap('data');
}

// Or use the hook
const data = useYMap('data');
```

## 🐛 Common Issues & Solutions

### Issue: "Multiple connections detected"

**Solution:** The new system prevents this! When you connect to a new room, the previous connection is automatically destroyed.

### Issue: "Memory leaks and crashes"

**Solution:** All cleanup is handled automatically by the ConnectionManager. No manual cleanup needed (except when you explicitly want to disconnect).

### Issue: "State not updating in UI"

**Solution:** Use the hooks! They automatically re-render when state changes.

```typescript
const { state } = useYjs(); // ✅ Auto-updates
const ydoc = useYDoc();     // ✅ Auto-updates
const data = useYMap('map'); // ✅ Auto-updates
```

### Issue: "Can't see connection status"

**Solution:** The DebugYjs component is always visible in the top-right. Minimize it if it's in the way, but it's there to help!

## 📊 Connection Lifecycle

### Connecting to a Room

1. User clicks "Create Room" or "Connect to Room"
2. System checks if already connected
3. If connected to different room → prompts to disconnect
4. Previous connection automatically destroyed
5. New connection established
6. State updates to 'connected'
7. DebugYjs panel shows live status

### During Connection

- YDoc syncs data via WebRTC
- IndexedDB persists data locally
- Peer count updates in real-time
- All changes sync across connected peers

### Disconnecting

1. User clicks disconnect (or connects to different room)
2. WebRTC provider destroyed
3. IndexedDB persistence closed
4. YDoc destroyed
5. State updates to 'disconnected'

## 🧪 Testing the New System

### Test 1: Single Connection Enforcement

1. Create a room "Room A"
2. Check DebugYjs - should show connected to "Room A"
3. Try to create "Room B"
4. System prompts to disconnect from "Room A"
5. After confirming, "Room A" disconnects and "Room B" connects
6. DebugYjs now shows "Room B"

### Test 2: Real-time Sync

1. Connect to a room on Device 1
2. Connect to same room on Device 2
3. DebugYjs on both devices should show `Peers: 1`
4. Type in any YJS-synced field
5. Changes appear instantly on other device

### Test 3: Persistence

1. Connect to a room
2. Add some data to YDoc
3. Close the app
4. Reopen and reconnect to same room
5. Data should still be there (from IndexedDB)

## 📖 API Reference

### useYjs()

```typescript
const {
  state,        // Current connection state
  connect,      // (config: ConnectionConfig) => Promise<void>
  disconnect,   // () => Promise<void>
  reconnect,    // () => Promise<void>
  clearRoomData,// (roomName: string) => Promise<void>
  getYDoc,      // () => Y.Doc | null
  isConnected   // boolean
} = useYjs();
```

### useYDoc()

```typescript
const ydoc = useYDoc(); // Y.Doc | null
// Auto-updates when connection changes
```

### useYMap(mapName)

```typescript
const data = useYMap<{ key: value }>('map-name');
// Auto-updates when map changes
// Returns empty object when disconnected
```

### useYArray(arrayName)

```typescript
const items = useYArray<string>('array-name');
// Auto-updates when array changes
// Returns empty array when disconnected
```

### useYText(textName)

```typescript
const { 
  text, 
  onChange, 
  setValue,
  insert, 
  delete: deleteText, 
  format, 
  toDelta, 
  toString 
} = useYText('text-name');

// text: string - Current text content (auto-updates)
// onChange: (e) => void - React onChange handler for input/textarea
// setValue: (text) => void - Replace entire text content
// insert(index, content, attributes?) - Insert text at position
// delete(index, length) - Delete text from position
// format(index, length, attributes) - Format text range
// toDelta() - Get Delta representation
// toString() - Get string representation
```

**Example - Simple Usage:**
```typescript
function MyInput() {
  const { text, onChange } = useYText('my-input');
  return <input value={text} onChange={onChange} />;
}
```

## 🎨 Best Practices

### 1. Always wrap connection calls in try-catch

```typescript
try {
  await connect(config);
} catch (error) {
  console.error('Connection failed:', error);
  // Show user-friendly error message
}
```

### 2. Check connection before using YDoc

```typescript
const ydoc = useYDoc();
if (!ydoc) {
  return <div>Please connect to a room first</div>;
}
```

### 3. Use the debug panel during development

Keep the DebugYjs panel visible while developing to monitor connection state in real-time.

### 4. Don't create multiple connections manually

Let the system handle it. Just call `connect()` whenever you need to switch rooms.

### 5. Use the hooks instead of accessing manager directly

```typescript
// ✅ Good
const { state } = useYjs();

// ❌ Avoid
import { connectionManager } from 'src/yjsRTC/ConnectionManager';
const state = connectionManager.getState();
```

### 6. Use useYText for text editing

```typescript
// Simple input/textarea (recommended)
const { text, onChange } = useYText('document');
<input value={text} onChange={onChange} />

// Advanced manipulation
const { text, insert, format, setValue } = useYText('document');
insert(0, 'Hello World');
format(0, 5, { bold: true }); // Make "Hello" bold
setValue('New content'); // Replace all text
```

## 🎯 What This Solves

- ✅ **No more multiple connections** causing conflicts
- ✅ **No more memory leaks** from un-cleaned resources
- ✅ **No more crashes** from state inconsistencies
- ✅ **No more manual cleanup** required
- ✅ **Clear visibility** of connection state
- ✅ **Type-safe** API with full TypeScript support
- ✅ **React-friendly** with hooks and context
- ✅ **Automatic** connection management

## 📚 Additional Resources

- Full documentation: `src/yjsRTC/README.md`
- Example components: `src/screens/CreateRoom.tsx`, `src/screens/ConnectToRoom.tsx`
- Debug component: `src/components/DebugYjs.tsx`
- Yjs docs: https://docs.yjs.dev/

## 🎉 Summary

The YJS connection system is now:
- **Centralized** - One singleton manager
- **Automatic** - No manual cleanup needed
- **Safe** - Only one connection at a time
- **Observable** - Real-time state updates
- **Debuggable** - Live connection monitoring
- **Easy to use** - Simple React hooks API

**You can now create and connect to rooms without worrying about state management, memory leaks, or crashes!**

---
